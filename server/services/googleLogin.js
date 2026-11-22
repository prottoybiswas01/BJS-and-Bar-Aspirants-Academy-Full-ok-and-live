const { createCipheriv, createDecipheriv, createHmac, randomBytes } = require('node:crypto');
const bcrypt = require('bcryptjs');
const { AuthError, getJwtConfiguration, sendAuthFailure, signSession } = require('./authSecurity');
const { fingerprint } = require('./firebaseIdentity');
const { accountResponse } = require('./responseFields');

const LINK_REQUEST_TTL_SECONDS = 30 * 60;

function linkKey(secret) {
  return createHmac('sha256', secret).update('academy-google-link:v1').digest();
}

function issueLinkRequest(identity, { kind, account }, secret) {
  const payload = JSON.stringify({
    uidKey: identity.uidKey, providerKey: identity.providerKey, emailKey: fingerprint(identity.email),
    kind, recordId: String(account._id), accountId: account.id,
    exp: Math.floor(Date.now() / 1000) + LINK_REQUEST_TTL_SECONDS
  });
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', linkKey(secret), nonce);
  const ciphertext = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
  return Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]).toString('base64url');
}

function readLinkRequest(code, secret) {
  if (typeof code !== 'string' || code.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(code)) {
    throw new AuthError('GOOGLE_LINK_INVALID');
  }
  const encoded = Buffer.from(code, 'base64url');
  try {
    const decipher = createDecipheriv('aes-256-gcm', linkKey(secret), encoded.subarray(0, 12));
    decipher.setAuthTag(encoded.subarray(12, 28));
    const request = JSON.parse(Buffer.concat([decipher.update(encoded.subarray(28)), decipher.final()]).toString('utf8'));
    if (Number.isSafeInteger(request.exp) && request.exp > Date.now() / 1000) return request;
  } catch (_) {
    // Invalid and expired codes share one public response.
  }
  throw new AuthError('GOOGLE_LINK_INVALID');
}

function assertEligible(kind, account) {
  if (!account?.id || ['Inactive', 'Blocked'].includes(account.status) ||
      account.loginApproval === 'Rejected' ||
      (kind === 'mentor' && (account.status !== 'Active' || account.loginApproval !== 'Approved'))) {
    throw new AuthError('FORBIDDEN');
  }
}

function registrationDetails(body) {
  const { university, courseId, phone = '' } = body;
  if (typeof university !== 'string' || !university.trim() || university.length > 180 || /[<>\x00-\x1f]/.test(university) ||
      typeof courseId !== 'string' || !courseId.trim() || courseId.length > 128 ||
      typeof phone !== 'string' || phone.length > 24) {
    throw new AuthError('GOOGLE_PROFILE_INVALID');
  }
  const googleContactPhone = phone.trim().replace(/^\+?88/, '');
  if (googleContactPhone && !/^01[3-9]\d{8}$/.test(googleContactPhone)) throw new AuthError('GOOGLE_PROFILE_INVALID');
  return { university: university.trim(), courseId: courseId.trim(), googleContactPhone };
}

function createGoogleLogin({ verifyIdentity, store, onStudentLogin, onStudentRegistration, env = process.env }) {
  async function respondWithSession(res, kind, account) {
    assertEligible(kind, account);
    const profile = accountResponse(account);
    if (kind === 'mentor') {
      const mentor = { ...profile, role: 'mentor', isMentor: true };
      const token = signSession({ id: mentor.id, isMentor: true, role: 'mentor' }, env);
      return res.json({ ok: true, token, isMentor: true, isAdmin: false, user: mentor, student: mentor, mentor });
    }

    const token = signSession({ id: profile.id, phone: profile.phone, role: 'student' }, env);
    await onStudentLogin(profile);
    return res.json({ ok: true, token, student: profile, isAdmin: false });
  }

  async function login(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const { secret } = getJwtConfiguration(env);
      const body = req.body || {};
      const identity = await verifyIdentity(body.idToken);
      const binding = await store.findLink(identity);
      if (binding) {
        const account = await store.loadAccount(binding.kind, binding.recordId);
        if (!account || account.id !== binding.accountId) throw new AuthError('GOOGLE_CONFLICT');
        return await respondWithSession(res, binding.kind, account);
      }

      const existing = await store.findExisting(identity.email);
      if (existing) {
        assertEligible(existing.kind, existing.account);
        return res.status(409).json({
          ok: false,
          code: 'GOOGLE_LINK_REQUIRED',
          message: 'বিদ্যমান অ্যাকাউন্টের সাথে Google সংযোগ করতে একাডেমির অনুমোদন প্রয়োজন।',
          linkRequest: issueLinkRequest(identity, existing, secret)
        });
      }

      if (body.university === undefined && body.courseId === undefined && body.phone === undefined) {
        const { email, name, photoUrl } = identity;
        return res.json({ ok: true, isNewUser: true, email, name, photoUrl });
      }
      const profile = registrationDetails(body);
      const id = 'STU-' + new Date().getFullYear() + '-' + randomBytes(8).toString('hex').toUpperCase();
      // Keep the unique legacy phone field populated without matching phone-number lookups.
      const phoneMarker = 'GOOGLE-' + randomBytes(16).toString('hex').replace(/\d/g, digit => 'ghijklmnop'[Number(digit)]);
      const student = await store.registerStudent(identity, {
        ...profile,
        id,
        name: identity.name,
        email: identity.email,
        phone: phoneMarker,
        password: await bcrypt.hash(randomBytes(32).toString('base64url'), 10),
        status: 'Pending',
        loginApproval: 'Pending',
        portalAccessMode: 'Pending Approval',
        enrolledCourseIds: [],
        allowedCourseIds: [],
        courseRules: []
      });

      onStudentRegistration(accountResponse(student));
      return await respondWithSession(res, 'student', student);
    } catch (error) {
      return sendAuthFailure(res, error?.code === 11000 ? new AuthError('GOOGLE_CONFLICT') : error);
    }
  }

  async function approveLink(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const { secret } = getJwtConfiguration(env);
      const { accountId, accountKind, linkRequest, ownershipVerified } = req.body || {};
      if (typeof accountId !== 'string' || ownershipVerified !== true) throw new AuthError('GOOGLE_LINK_INVALID');
      const request = readLinkRequest(linkRequest, secret);
      if (accountId.trim() !== request.accountId || accountKind !== request.kind) throw new AuthError('GOOGLE_LINK_INVALID');
      await store.approveLink(request, req.user.id, assertEligible);
      return res.json({ ok: true });
    } catch (error) {
      return sendAuthFailure(res, error?.code === 11000 ? new AuthError('GOOGLE_CONFLICT') : error);
    }
  }

  return { login, approveLink };
}

module.exports = { createGoogleLogin };
