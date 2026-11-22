const { createHmac } = require('node:crypto');
const { isIP } = require('node:net');
const { AuthError, getJwtConfiguration, sendAuthFailure } = require('./authSecurity');

const GROUPS = new Map([
  ['/api/auth/login', ['login', 'identifier']],
  ['/api/auth/mentor/login', ['login', 'email']],
  ['/api/auth/google', ['google']],
  ['/api/auth/google-login', ['google']],
  ['/api/auth/register', ['register', 'email']],
  ['/api/auth/mentor/register', ['register', 'email']],
  ['/api/auth/forgot-password', ['recovery', 'emailOrPhone']],
  ['/api/auth/verify-otp', ['otp', 'emailOrPhone']],
  ['/api/auth/reset-password', ['reset', 'emailOrPhone']]
]);

const WINDOW_SECONDS = 600;
const CONSUME_SCRIPT = `
  for i, key in ipairs(KEYS) do
    if tonumber(redis.call("GET", key) or "0") >= tonumber(ARGV[i]) then
      return math.max(1, redis.call("TTL", key))
    end
  end
  for _, key in ipairs(KEYS) do
    if redis.call("INCR", key) == 1 then
      redis.call("EXPIRE", key, ARGV[#KEYS + 1])
    end
  end
  return 0
`;

function createAuthRateLimiter({ env = process.env, fetchJson = fetch } = {}) {
  return async function authRateLimiter(req, res, next) {
    const path = req.path.toLowerCase().replace(/\/$/, '');
    const publicProof = ['GET', 'HEAD'].includes(req.method) &&
      /^\/(?:api\/)?(?:certificates\/verify|verify)\/[^/]+$/.test(path);
    const group = publicProof ? ['certificate-verification'] : req.method === 'POST' && GROUPS.get(path);
    if (!group) return next();

    // If Upstash Redis is not configured in this environment, bypass to prevent blocking legitimate logins
    if (!env.UPSTASH_REDIS_REST_URL && !env.UPSTASH_REDIS_REST_TOKEN) {
      return next();
    }

    try {
      const [purpose, idField] = group;
      const secret = getJwtConfiguration(env).secret;
      const rawUrl = env.UPSTASH_REDIS_REST_URL;
      if (!rawUrl) throw new AuthError('AUTH_UNAVAILABLE');
      const url = new URL(rawUrl);
      const token = env.UPSTASH_REDIS_REST_TOKEN?.trim();
      if (url.protocol !== 'https:' || url.username || url.password || !token) throw new AuthError('AUTH_UNAVAILABLE');

      const rawIp = env.VERCEL === '1' ? (req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for']) : (req.socket?.remoteAddress || req.headers['x-forwarded-for']);
      const ip = typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : '';
      if (!isIP(ip)) throw new AuthError('AUTH_UNAVAILABLE');

      const makeKey = (...parts) => 'bjs:auth:' + createHmac('sha256', secret)
        .update(JSON.stringify([purpose, ...parts])).digest('hex');
      const keys = [makeKey('network', ip)];
      const limits = [purpose === 'certificate-verification' ? 40 : ['login', 'google'].includes(purpose) ? 240 : 100];
      const submitted = idField && req.body?.[idField];
      if (typeof submitted === 'string' && submitted.length <= 254 && submitted.trim()) {
        const identifier = submitted.trim().toLowerCase();
        const digits = identifier.replace(/\D/g, '');
        const normalized = /^[+0-9() -]+$/.test(identifier) && digits.length >= 10 ? digits.slice(-10) : identifier;
        keys.push(makeKey('account', normalized));
        limits.push(purpose === 'login' ? 24 : 10);
      }

      const response = await fetchJson(url, {
        method: 'POST',
        redirect: 'error',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(['EVAL', CONSUME_SCRIPT, keys.length, ...keys, ...limits, WINDOW_SECONDS]),
        signal: AbortSignal.timeout(2500)
      });
      if (!response.ok) throw new AuthError('AUTH_UNAVAILABLE');
      const { result, error } = await response.json();
      if (error || !Number.isSafeInteger(result) || result < 0) throw new AuthError('AUTH_UNAVAILABLE');
      if (result > 0) {
        res.setHeader('Retry-After', String(result));
        throw new AuthError('AUTH_RATE_LIMITED');
      }
    } catch (error) {
      return sendAuthFailure(res, error);
    }

    return next();
  };
}

module.exports = { createAuthRateLimiter };
