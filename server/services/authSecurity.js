const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');

const ADMIN_IDENTITY = Object.freeze({ id: 'ADMIN-001', role: 'admin', name: 'Super Admin', isAdmin: true });
const SESSION_ALGORITHM = 'HS256';
const LEGACY_SESSION_MAX_MS = 7 * 24 * 60 * 60 * 1000;
const BCRYPT_HASH = /^\$2[aby]\$(0[4-9]|[12]\d|3[01])\$[./A-Za-z0-9]{53}$/;

const failures = {
  AUTH_UNAVAILABLE: [503, 'লগইন সেবা সাময়িকভাবে পাওয়া যাচ্ছে না।'],
  INVALID_CREDENTIALS: [401, 'লগইন তথ্য সঠিক নয়।'],
  SESSION_REQUIRED: [401, 'অনুগ্রহ করে লগইন করুন।'],
  SESSION_INVALID: [401, 'সেশনটি অবৈধ। অনুগ্রহ করে আবার লগইন করুন।'],
  SESSION_EXPIRED: [401, 'সেশনের মেয়াদ শেষ। অনুগ্রহ করে আবার লগইন করুন।'],
  FORBIDDEN: [403, 'এই কাজের অনুমতি আপনার নেই।']
};

class AuthError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

function sendAuthFailure(res, error) {
  const code = error instanceof AuthError && Object.hasOwn(failures, error.code) ? error.code : 'AUTH_UNAVAILABLE';
  res.setHeader('Cache-Control', 'no-store');
  const [status, message] = failures[code];
  return res.status(status).json({ ok: false, code, message });
}

function getJwtConfiguration(env) {
  const secret = env.JWT_SECRET;
  if (typeof secret !== 'string' || Buffer.byteLength(secret) < 43 ||
      /\s/.test(secret) || new Set(secret).size < 16 ||
      /^(?:change[-_]?me|replace[-_]?me|your[-_]?jwt|example[-_]?jwt)/i.test(secret)) {
    throw new AuthError('AUTH_UNAVAILABLE');
  }
  return {
    secret,
    issuer: env.JWT_ISSUER?.trim() || 'https://bjs.kodl.uk',
    audience: env.JWT_AUDIENCE?.trim() || 'bjs-academy'
  };
}

function adminUsername(env) {
  return env.ADMIN_USERNAME?.trim().toLowerCase() || '';
}

function getAdminConfiguration(env) {
  const username = adminUsername(env);
  const hash = env.ADMIN_PASSWORD_HASH;
  const cost = typeof hash === 'string' && BCRYPT_HASH.exec(hash);
  if (!username || username.length > 254 || !cost || Number(cost[1]) < 12 || Number(cost[1]) > 15) {
    throw new AuthError('AUTH_UNAVAILABLE');
  }
  return { username, hash };
}

function isAdminIdentifier(identifier, env = process.env) {
  const username = adminUsername(env);
  return Boolean(username && identifier.trim().toLowerCase() === username);
}

async function verifyAdminCredentials(identifier, password, env = process.env) {
  const { username, hash } = getAdminConfiguration(env);
  if (typeof password !== 'string' || Buffer.byteLength(password) > 72) return false;

  // Do the same password check when the identifier is wrong.
  const matches = await bcrypt.compare(password, hash);
  return identifier.trim().toLowerCase() === username && matches;
}

async function verifyAccountPassword(input, storedPassword) {
  if (typeof input !== 'string' || typeof storedPassword !== 'string') return false;
  const password = input.trim();
  const stored = storedPassword.trim();
  if (!password || !stored) return false;

  if (BCRYPT_HASH.test(stored)) return bcrypt.compare(password, stored);
  if (/^\$2[aby]\$/.test(stored)) return false;
  // Keep legacy per-account passwords usable during the separate credential migration.
  const digest = value => crypto.createHash('sha256').update(value).digest();
  return crypto.timingSafeEqual(digest(password), digest(stored));
}

function signSession(claims, env = process.env) {
  const { secret, issuer, audience } = getJwtConfiguration(env);
  const id = claims.id == null ? '' : String(claims.id);
  if (!id) throw new AuthError('AUTH_UNAVAILABLE');
  return jwt.sign({ ...claims, id }, secret, {
    algorithm: SESSION_ALGORITHM,
    expiresIn: claims.role === 'admin' ? '24h' : '7d',
    issuer,
    audience
  });
}

function acceptsLegacySession(claims, env) {
  if (claims.role === 'admin' || claims.iss !== undefined || claims.aud !== undefined) return false;
  const cutoff = env.JWT_LEGACY_ACCEPT_UNTIL;
  if (typeof cutoff !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(cutoff)) return false;
  const deadline = Date.parse(cutoff);
  const now = Date.now();
  return deadline > now && deadline <= now + LEGACY_SESSION_MAX_MS;
}

function readSession(req, env) {
  const header = req.headers?.authorization;
  if (header === undefined) throw new AuthError('SESSION_REQUIRED');

  const token = typeof header === 'string' && /^Bearer ([^\s,]+)$/i.exec(header)?.[1];
  if (!token || token.length > 4096) throw new AuthError('SESSION_INVALID');
  const { secret, issuer, audience } = getJwtConfiguration(env);

  let claims;
  try {
    claims = jwt.verify(token, secret, { algorithms: [SESSION_ALGORITHM] });
  } catch (error) {
    throw new AuthError(error.name === 'TokenExpiredError' ? 'SESSION_EXPIRED' : 'SESSION_INVALID');
  }

  if (!claims || typeof claims.id !== 'string' || !claims.id ||
      !Number.isSafeInteger(claims.exp) || !['admin', 'mentor', 'student'].includes(claims.role) ||
      (!(claims.iss === issuer && claims.aud === audience) && !acceptsLegacySession(claims, env))) {
    throw new AuthError('SESSION_INVALID');
  }
  return claims;
}

function createAuthentication({ findStudent, findMentor, env = process.env }) {
  async function authenticate(req, role) {
    const claims = readSession(req, env);
    if (role && claims.role !== role) throw new AuthError('FORBIDDEN');

    if (claims.role === 'admin') {
      if (claims.id !== ADMIN_IDENTITY.id) throw new AuthError('SESSION_INVALID');
      getAdminConfiguration(env);
      return { ...ADMIN_IDENTITY };
    }

    const mentor = claims.role === 'mentor';
    const account = await (mentor ? findMentor : findStudent)(claims.id);
    if (!account || ['Inactive', 'Blocked'].includes(account.status) ||
        (mentor && account.loginApproval === 'Rejected')) {
      throw new AuthError('SESSION_INVALID');
    }
    return { ...account, role: claims.role, isAdmin: false, isMentor: mentor };
  }

  const requireRole = (role) => async (req, res, next) => {
    try {
      req.user = await authenticate(req, role);
    } catch (error) {
      return sendAuthFailure(res, error);
    }
    return next();
  };

  return {
    requireAuthentication: requireRole(),
    requireAdmin: requireRole('admin'),
    async getAuthUserFromRequest(req) {
      try { return await authenticate(req); } catch (_) { return null; }
    }
  };
}

module.exports = {
  ADMIN_IDENTITY,
  AuthError,
  createAuthentication,
  getJwtConfiguration,
  isAdminIdentifier,
  sendAuthFailure,
  signSession,
  verifyAdminCredentials,
  verifyAccountPassword
};
