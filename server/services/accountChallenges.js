const { createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } = require('node:crypto');
const { AuthError } = require('./authSecurity');

function createAccountChallenges({ collection, secret }) {
  const mac = (...parts) => createHmac('sha256', secret()).update(JSON.stringify(['account-challenge-v1', ...parts])).digest('hex');
  const key = (purpose, owner) => mac(purpose, owner);

  async function issue({ purpose, owner, email, originalEmail }) {
    const now = new Date();
    const _id = key(purpose, owner);
    const issueId = randomUUID();
    const code = String(randomInt(0, 1000000)).padStart(6, '0');
    try {
      await collection().updateOne({
        _id, $or: [{ issuedAt: { $lte: new Date(now.getTime() - 60000) } }, { issuedAt: { $exists: false } }]
      }, {
        $set: {
          issueId, issuedAt: now, email, originalEmail, attempts: 0,
          otpHash: mac('otp', _id, issueId, code), expiresAt: new Date(now.getTime() + 600000)
        },
        $unset: { resetHash: "" }
      }, { upsert: true });
    } catch (error) {
      if (error?.code === 11000) throw new AuthError('AUTH_RATE_LIMITED');
      throw error;
    }
    return code;
  }

  async function verify({ purpose, owner, email, code }) {
    if (typeof code !== 'string' || !/^\d{6}$/.test(code)) throw new AuthError('INVALID_INPUT');
    const _id = key(purpose, owner);
    const challenge = await collection().findOneAndUpdate({
      _id, email, expiresAt: { $gt: new Date() }, attempts: { $lt: 5 }, otpHash: { $exists: true }
    }, { $inc: { attempts: 1 } }, { returnDocument: 'after' });
    if (!challenge || !timingSafeEqual(Buffer.from(challenge.otpHash), Buffer.from(mac('otp', _id, challenge.issueId, code)))) {
      throw new AuthError('VERIFICATION_FAILED');
    }
    return challenge;
  }

  async function permitReset(challenge) {
    const resetToken = randomBytes(32).toString('base64url');
    const result = await collection().updateOne({
      _id: challenge._id, issueId: challenge.issueId, otpHash: challenge.otpHash, expiresAt: { $gt: new Date() }
    }, {
      $set: { resetHash: mac('reset', challenge._id, resetToken), expiresAt: new Date(Date.now() + 900000) },
      $unset: { otpHash: "" }
    });
    if (result.modifiedCount !== 1) throw new AuthError('VERIFICATION_FAILED');
    return resetToken;
  }

  async function takeEmailChange(challenge, session) {
    const result = await collection().findOneAndDelete({
      _id: challenge._id, issueId: challenge.issueId, otpHash: challenge.otpHash, expiresAt: { $gt: new Date() }
    }, { session });
    if (!result) throw new AuthError('VERIFICATION_FAILED');
    return result;
  }

  async function takeReset(owner, email, resetToken, session) {
    if (typeof resetToken !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(resetToken)) throw new AuthError('VERIFICATION_FAILED');
    const _id = key('password-reset', owner);
    const result = await collection().findOneAndDelete({
      _id, email, resetHash: mac('reset', _id, resetToken), expiresAt: { $gt: new Date() }
    }, { session });
    if (!result) throw new AuthError('VERIFICATION_FAILED');
  }

  return { issue, verify, permitReset, takeEmailChange, takeReset };
}

module.exports = { createAccountChallenges };
