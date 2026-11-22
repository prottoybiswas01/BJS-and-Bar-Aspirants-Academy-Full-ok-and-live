const { createHash } = require('node:crypto');
const { cert, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { AuthError } = require('./authSecurity');

const REJECTED_TOKENS = new Set([
  'auth/argument-error', 'auth/invalid-argument', 'auth/invalid-id-token', 'auth/id-token-expired',
  'auth/id-token-revoked', 'auth/user-disabled', 'auth/user-not-found', 'auth/tenant-id-mismatch'
]);
const fingerprint = (...parts) => createHash('sha256').update(JSON.stringify(parts)).digest('hex');

function createFirebaseIdentityVerifier({
  env = process.env,
  initializeAuth = ({ projectId, clientEmail, privateKey }) => getAuth(initializeApp({
    projectId,
    credential: cert({ projectId, clientEmail, privateKey })
  }, 'academy-google-auth'))
} = {}) {
  let firebaseAuth;

  return async function verifyFirebaseIdentity(idToken) {
    if (idToken == null || idToken === '') throw new AuthError('SESSION_REQUIRED');
    if (typeof idToken !== 'string' || idToken.length > 8192 ||
        !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(idToken)) {
      throw new AuthError('SESSION_INVALID');
    }

    const projectId = env.FIREBASE_PROJECT_ID?.trim();
    const clientEmail = env.FIREBASE_CLIENT_EMAIL?.trim();
    const privateKey = env.FIREBASE_PRIVATE_KEY?.trim().replace(/\\n/g, '\n');
    if (!projectId || !clientEmail || !privateKey || env.FIREBASE_AUTH_EMULATOR_HOST) {
      throw new AuthError('AUTH_UNAVAILABLE');
    }

    let claims;
    try {
      firebaseAuth ??= initializeAuth({ projectId, clientEmail, privateKey });
      claims = await firebaseAuth.verifyIdToken(idToken, true);
    } catch (error) {
      if (error?.code === 'auth/id-token-expired') throw new AuthError('SESSION_EXPIRED');
      throw new AuthError(REJECTED_TOKENS.has(error?.code) ? 'SESSION_INVALID' : 'AUTH_UNAVAILABLE');
    }

    const subject = claims?.firebase?.identities?.['google.com'];
    if (!claims || claims.aud !== projectId || claims.iss !== 'https://securetoken.google.com/' + projectId ||
        typeof claims.uid !== 'string' || claims.uid.length < 1 || claims.uid.length > 128 ||
        claims.uid !== claims.sub || claims.firebase?.tenant || claims.firebase?.sign_in_provider !== 'google.com' ||
        !Array.isArray(subject) || subject.length !== 1 || typeof subject[0] !== 'string' ||
        subject[0].length < 1 || subject[0].length > 256) {
      throw new AuthError('SESSION_INVALID');
    }
    if (!Number.isSafeInteger(claims.exp) || claims.exp <= Date.now() / 1000) {
      throw new AuthError('SESSION_EXPIRED');
    }

    const email = typeof claims.email === 'string' ? claims.email.trim().toLowerCase() : '';
    if (claims.email_verified !== true || email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) {
      throw new AuthError('GOOGLE_EMAIL_UNVERIFIED');
    }
    const name = typeof claims.name === 'string' ? claims.name.replace(/[<>\x00-\x1f]/g, '').trim().slice(0, 100) : '';
    const photoUrl = typeof claims.picture === 'string' && claims.picture.length <= 2048 &&
      /^https:\/\/(?:[a-z0-9-]+\.)*googleusercontent\.com\//i.test(claims.picture) ? claims.picture : '';
    return {
      email, name: name || 'Google Student', photoUrl,
      uidKey: fingerprint(projectId, 'firebase', claims.uid),
      providerKey: fingerprint(projectId, 'google.com', subject[0])
    };
  };
}

module.exports = { createFirebaseIdentityVerifier, fingerprint };
