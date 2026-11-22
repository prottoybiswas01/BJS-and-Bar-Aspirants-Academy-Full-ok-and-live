const assert = require('node:assert/strict');
const { generateKeyPairSync, randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createAuthentication, signSession } = require('./server/services/authSecurity');
const { createAuthRateLimiter } = require('./server/services/authRateLimit');
const { createFirebaseIdentityVerifier } = require('./server/services/firebaseIdentity');
const { createGoogleAccountStore } = require('./server/services/googleAccountStore');
const { createGoogleLogin } = require('./server/services/googleLogin');

const projectId = 'fixture-firebase-project';
const env = {
  JWT_SECRET: randomBytes(32).toString('base64url'),
  ADMIN_USERNAME: 'fixture-admin',
  ADMIN_PASSWORD_HASH: bcrypt.hashSync('synthetic-admin-password', 12),
  FIREBASE_PROJECT_ID: projectId,
  FIREBASE_CLIENT_EMAIL: 'firebase@example.invalid',
  FIREBASE_PRIVATE_KEY: 'unused-synthetic-sdk-key'
};
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const student = {
  _id: '000000000000000000000001', id: 'STU-FIXTURE', name: 'Existing Student',
  email: 'student+fixture@example.invalid', status: 'Active', loginApproval: 'Approved',
  password: 'fixture-only', allowedCourseIds: ['fixture-enrolled']
};
const mentor = {
  _id: '000000000000000000000002', id: 'MTR-FIXTURE', name: 'Existing Mentor',
  email: 'mentor@example.invalid', status: 'Active', loginApproval: 'Approved',
  password: 'fixture-only', assignedCourseIds: ['fixture-mentor-course']
};

function googleToken({ email = student.email, uid = 'fixture-uid', googleSubject = uid, options = {}, claims = {} } = {}) {
  return jwt.sign({
    email, email_verified: true, name: 'Fixture Google User',
    firebase: { sign_in_provider: 'google.com', identities: { 'google.com': [googleSubject] } },
    ...claims
  }, privateKey, {
    algorithm: 'RS256', issuer: 'https://securetoken.google.com/' + projectId,
    audience: projectId, subject: uid, expiresIn: 60, ...options
  });
}

// Model queries and transactional writes are isolated fixtures. There is no
// dotenv load, networked SDK call, Redis connection, or MongoDB server startup.
function database({ students = [student], mentors = [mentor], registrations = [], receipts = [] } = {}) {
  let data = structuredClone({
    students, mentors, registrations, receipts, links: [],
    courses: [{ id: 'course-fixture', title: 'Fixture Course', status: 'Active' }]
  });
  let currentTransaction = Promise.resolve();
  let nextId = 3;
  const filterMatches = (row, filter) => Object.entries(filter).every(([field, term]) => {
    if (field === '$or') return term.some(condition => filterMatches(row, condition));
    if (term instanceof RegExp) return term.test(row[field] || '');
    if (term?.$nin) return !term.$nin.includes(row[field]);
    return row[field] === term;
  });
  function query(resolve) {
    let limit = Infinity;
    let state;
    const chain = {
      select: () => chain,
      limit: count => { limit = count; return chain; },
      session: handle => { state = handle; return chain; },
      lean: async () => resolve(state || data, limit),
      then: (onResolve, onReject) => chain.lean().then(onResolve, onReject)
    };
    return chain;
  }
  function model(name) {
    return {
      find: filter => query((state, limit) => state[name].filter(row => filterMatches(row, filter)).slice(0, limit)),
      findOne: filter => query(state => state[name].find(row => filterMatches(row, filter))),
      findById: id => query(state => state[name].find(row => row._id === id)),
      exists: filter => query(state => state[name].some(row => filterMatches(row, filter))),
      async create([account], { session }) {
        assert.ok(session, 'Registration must use the binding transaction');
        const created = { _id: (nextId++).toString(16).padStart(24, '0'), ...account };
        session[name].push(created);
        return [created];
      }
    };
  }
  const mongoose = {
    isObjectIdOrHexString: id => /^[a-f0-9]{24}$/.test(id),
    connection: {
      db: {
        collection: () => ({
          findOne: async ({ _id }, { session } = {}) => (session || data).links.find(row => row._id === _id),
          async insertMany(rows, { session }) {
            assert.ok(session, 'All binding constraints must use one transaction');
            for (const row of rows) {
              if (session.links.some(existing => existing._id === row._id)) {
                throw Object.assign(new Error('fixture duplicate'), { code: 11000 });
              }
              session.links.push(row);
            }
          }
        })
      },
      transaction(run) {
        const result = currentTransaction.then(async () => {
          const draft = structuredClone(data);
          const value = await run(draft);
          data = draft;
          return value;
        });
        currentTransaction = result.catch(() => {});
        return result;
      }
    }
  };
  const store = createGoogleAccountStore({
    mongoose, Student: model('students'), Mentor: model('mentors'), Registration: model('registrations'),
    Receipt: model('receipts'), Course: model('courses'), isConnected: () => true
  });
  return { store, read: () => structuredClone(data) };
}

const server = fs.readFileSync(path.join(__dirname, 'server/server.js'), 'utf8');
const routeSource = server.slice(server.indexOf('const googleLoginHandlers'), server.indexOf('// Nodemailer SMTP Transporter'));
const googleRoutes = new vm.Script(routeSource, { filename: 'server/server.js (isolated Google routes)' });

function response() {
  const result = { status: 200, headers: {} };
  const res = {
    status: code => { result.status = code; return res; },
    json: value => { result.body = value; return res; },
    setHeader: (name, value) => { result.headers[name] = value; }
  };
  return { result, res };
}

function harness({ config = {}, tables = {}, sdkError } = {}) {
  const settings = { ...env, ...config };
  const { store, read } = database(tables);
  const registrations = [];
  let checks = 0;
  const verifyIdentity = createFirebaseIdentityVerifier({
    env: settings,
    initializeAuth: () => ({
      async verifyIdToken(token, checkRevoked) {
        assert.equal(checkRevoked, true);
        checks += 1;
        if (sdkError) throw Object.assign(new Error('private provider detail'), { code: sdkError });
        try {
          const claims = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
          return { ...claims, uid: claims.sub };
        } catch (error) {
          throw Object.assign(error, { code: error.name === 'TokenExpiredError' ? 'auth/id-token-expired' : 'auth/argument-error' });
        }
      }
    })
  });
  const auth = createAuthentication({
    env: settings,
    findStudent: async id => read().students.find(row => row.id === id),
    findMentor: async id => read().mentors.find(row => row.id === id)
  });
  const routes = new Map();
  googleRoutes.runInNewContext({
    createGoogleLogin: options => createGoogleLogin({
      ...options, env: settings, onStudentRegistration: value => registrations.push(value), onStudentLogin: async () => {}
    }),
    createFirebaseIdentityVerifier: () => verifyIdentity,
    createGoogleAccountStore: () => store,
    mongoose: {}, Student: {}, Mentor: {}, Registration: {}, Receipt: {}, Course: {},
    requireAdmin: auth.requireAdmin,
    app: { post: (paths, ...handlers) => { for (const route of [paths].flat()) routes.set(route, handlers); } }
  });

  async function post(route, body, appToken) {
    const { res, result } = response();
    const req = { body, headers: { authorization: appToken && 'Bearer ' + appToken } };
    const handlers = routes.get(route);
    assert.ok(handlers);
    let index = 0;
    const next = () => handlers[index++](req, res, next);
    await next();
    return result;
  }

  return {
    read, registrations, auth, get checks() { return checks; },
    login: (token, body = {}, route = '/api/auth/google-login') => post(route, { ...body, idToken: token }),
    approve(linkRequest, accountId, {
      appToken = signSession({ id: 'ADMIN-001', role: 'admin' }, env),
      ownershipVerified = true,
      accountKind = accountId === mentor.id ? 'mentor' : 'student'
    } = {}) {
      return post('/api/admin/google-account-links/approve', { linkRequest, accountId, accountKind, ownershipVerified }, appToken);
    }
  };
}

test('every Google alias rejects identity-only requests before issuing an application token', async () => {
  const app = harness();
  for (const route of ['/api/auth/google', '/api/auth/google-login', '/auth/google-login']) {
    const result = await app.login(undefined, { email: mentor.email, firebaseUid: 'claimed-uid', role: 'admin' }, route);
    assert.equal(result.status, 401);
    assert.equal(result.body.code, 'SESSION_REQUIRED');
    assert.equal(Object.hasOwn(result.body, 'token'), false);
  }
  assert.equal(app.checks, 0);
  assert.equal(app.read().links.length, 0);
});

test('malformed, forged, expired and wrong-project ID tokens fail', async () => {
  const app = harness();
  const genuine = googleToken();
  const [header, body] = genuine.split('.');
  for (const [token, code] of [
    ['bad-format', 'SESSION_INVALID'],
    [header + '.' + body + '.' + randomBytes(256).toString('base64url'), 'SESSION_INVALID'],
    [googleToken({ options: { expiresIn: -1 } }), 'SESSION_EXPIRED'],
    [googleToken({ options: { audience: 'other-project' } }), 'SESSION_INVALID'],
    [googleToken({ options: { issuer: 'https://securetoken.google.com/other-project' } }), 'SESSION_INVALID']
  ]) {
    const result = await app.login(token);
    assert.equal(result.status, 401);
    assert.equal(result.body.code, code);
  }
});

test('verified Google token controls identity even when body email, UID and role are forged', async () => {
  const app = harness();
  const result = await app.login(googleToken({ email: 'new@example.invalid' }), {
    email: mentor.email, firebaseUid: 'claimed-mentor', role: 'mentor', isAdmin: true, accountId: mentor.id,
    name: 'Untrusted name'
  });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    ok: true, isNewUser: true, email: 'new@example.invalid', name: 'Fixture Google User', photoUrl: ''
  });
  assert.equal(app.checks, 1);
});

test('unverified email, wrong provider, tenant token and invalid Firebase UID are rejected', async () => {
  const app = harness();
  assert.equal((await app.login(googleToken({ claims: { email_verified: false } }))).body.code, 'GOOGLE_EMAIL_UNVERIFIED');
  for (const firebase of [
    { sign_in_provider: 'password', identities: { 'google.com': ['fixture-uid'] } },
    { sign_in_provider: 'google.com', identities: {} },
    { sign_in_provider: 'google.com', tenant: 'another-tenant', identities: { 'google.com': ['fixture-uid'] } }
  ]) {
    assert.equal((await app.login(googleToken({ claims: { firebase } }))).body.code, 'SESSION_INVALID');
  }
  assert.equal((await app.login(googleToken({ uid: 'a'.repeat(129) }))).body.code, 'SESSION_INVALID');
});

test('disabled/revoked Firebase accounts are denied and provider outages fail securely', async () => {
  for (const sdkError of ['auth/id-token-revoked', 'auth/user-disabled', 'auth/user-not-found']) {
    const result = await harness({ sdkError }).login(googleToken());
    assert.equal(result.status, 401);
  }
  const result = await harness({ sdkError: 'auth/internal-error' }).login(googleToken());
  assert.equal(result.status, 503);
  assert.equal(JSON.stringify(result).includes('private provider detail'), false);
});

test('missing Firebase configuration and emulator configuration fail securely', async () => {
  for (const config of [
    { FIREBASE_PRIVATE_KEY: '' },
    { FIREBASE_PROJECT_ID: '' },
    { FIREBASE_CLIENT_EMAIL: '' },
    { FIREBASE_AUTH_EMULATOR_HOST: 'unused.example.invalid' }
  ]) {
    const app = harness({ config });
    const result = await app.login(googleToken());
    assert.equal(result.status, 503);
    assert.equal(app.checks, 0);
  }
  assert.equal((await harness({ config: { JWT_SECRET: '' } }).login(googleToken())).status, 503);
});

test('verified email alone grants no session or link, and approval needs authorized independent verification', async () => {
  const app = harness();
  const token = googleToken();
  const attempt = await app.login(token, { university: 'Fixture university', courseId: 'course-fixture' });
  assert.equal(attempt.status, 409);
  assert.equal(attempt.body.code, 'GOOGLE_LINK_REQUIRED');
  const code = attempt.body.linkRequest;
  assert.ok(code);
  assert.equal(Buffer.from(code, 'base64url').includes(Buffer.from(student.id)), false);
  assert.equal(Object.hasOwn(attempt.body, 'token'), false);
  assert.equal((await app.approve(code, student.id, { appToken: null })).status, 401);
  const studentSession = signSession({ id: student.id, role: 'student' }, env);
  assert.equal((await app.approve(code, student.id, { appToken: studentSession })).status, 403);
  assert.equal((await app.approve(code, student.id, { ownershipVerified: false })).status, 400);
  assert.equal((await app.approve(code, student.id, { accountKind: 'mentor' })).status, 400);
  assert.equal((await app.approve(code, mentor.id)).status, 400);
  assert.equal((await app.approve((code[0] === 'A' ? 'B' : 'A') + code.slice(1), student.id)).status, 400);
  assert.equal(app.read().links.length, 0);
  assert.deepEqual(app.read().students, [student]);
});

test('approved existing Student keeps identity, enrollment and COMMAND 02 JWT contract', async () => {
  const app = harness();
  const token = googleToken();
  const unlinked = await app.login(token);
  assert.equal((await app.approve(unlinked.body.linkRequest, student.id)).status, 200);
  const result = await app.login(token, { role: 'mentor', isAdmin: true, accountId: mentor.id, email: mentor.email });
  assert.equal(result.status, 200);
  assert.equal(result.body.student.id, student.id);
  assert.deepEqual(result.body.student.allowedCourseIds, student.allowedCourseIds);
  assert.equal(result.body.isAdmin, false);
  assert.equal(Object.hasOwn(result.body.student, 'password'), false);
  const claims = jwt.verify(result.body.token, env.JWT_SECRET, {
    algorithms: ['HS256'], issuer: 'https://bjs.kodl.uk', audience: 'bjs-academy'
  });
  assert.equal(claims.role, 'student');
  assert.equal(claims.id, student.id);
  assert.equal(claims.exp - claims.iat, 604800);
  const principal = await app.auth.getAuthUserFromRequest({ headers: { authorization: 'Bearer ' + result.body.token } });
  assert.equal(principal.id, student.id);
  assert.equal(principal.isMentor, false);
  assert.deepEqual(app.read().students, [student]);
});

test('an expired linking request makes no changes', async t => {
  const app = harness();
  const result = await app.login(googleToken());
  const later = Date.now() + 31 * 60 * 1000;
  t.mock.method(Date, 'now', () => later);
  assert.equal((await app.approve(result.body.linkRequest, student.id)).status, 400);
  assert.equal(app.read().links.length, 0);
});

test('approved existing Mentor signs in as Mentor, and pending Mentor cannot link', async () => {
  const app = harness();
  const token = googleToken({ email: mentor.email });
  const attempt = await app.login(token);
  assert.equal((await app.approve(attempt.body.linkRequest, mentor.id)).status, 200);
  const result = await app.login(token, { role: 'admin', isAdmin: true });
  assert.equal(result.status, 200);
  assert.equal(result.body.mentor.id, mentor.id);
  assert.deepEqual(result.body.mentor.assignedCourseIds, mentor.assignedCourseIds);
  assert.equal(jwt.decode(result.body.token).role, 'mentor');
  assert.equal(result.body.isAdmin, false);
  const pending = harness({ tables: { mentors: [{ ...mentor, loginApproval: 'Pending' }] } });
  assert.equal((await pending.login(token)).status, 403);
  assert.equal(pending.read().links.length, 0);
});

test('Firebase UID, Google subject, and account bindings cannot be overwritten', async () => {
  const app = harness();
  const token = googleToken();
  const original = await app.login(token);
  await app.approve(original.body.linkRequest, student.id);
  const before = app.read().links;

  assert.equal((await app.login(googleToken({ googleSubject: 'new-subject' }))).status, 409);
  assert.equal((await app.login(googleToken({ uid: 'different-uid', googleSubject: 'fixture-uid' }))).status, 409);
  const another = await app.login(googleToken({ uid: 'different-uid' }));
  assert.equal((await app.approve(another.body.linkRequest, student.id)).status, 409);
  assert.deepEqual(app.read().links, before);
});

test('new verified students register once and client contact fields cannot grant identity or courses', async () => {
  const app = harness();
  const token = googleToken({ email: 'new@example.invalid' });
  const result = await app.login(token, {
    university: 'Fixture University', courseId: 'course-fixture', phone: '+8801712345678',
    role: 'admin', status: 'Active', allowedCourseIds: ['unauthorized'], email: mentor.email
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.student.email, 'new@example.invalid');
  assert.equal(result.body.student.status, 'Pending');
  assert.equal(result.body.student.phone, '');
  assert.deepEqual(result.body.student.allowedCourseIds, []);
  const saved = app.read().students.find(row => row.id === result.body.student.id);
  assert.equal(saved.googleContactPhone, '01712345678');
  assert.match(saved.phone, /^GOOGLE-[a-p]{32}$/);
  assert.equal(await bcrypt.compare('fixture-uid', saved.password), false);
  const replay = await app.login(token, { university: 'Another', courseId: 'course-fixture' });
  assert.equal(replay.body.student.id, saved.id);
  assert.equal(app.registrations.length, 1);
  assert.equal(app.read().students.length, 2);
});

test('concurrent signup, ambiguous records, pending registrations and orphaned receipts cannot create duplicates', async () => {
  const email = 'new@example.invalid';
  const details = { university: 'Fixture University', courseId: 'course-fixture' };
  const app = harness();
  const outputs = await Promise.all([
    app.login(googleToken({ email, uid: 'first-uid' }), details),
    app.login(googleToken({ email, uid: 'second-uid' }), details)
  ]);
  assert.deepEqual(outputs.map(out => out.status).sort(), [200, 409]);
  assert.equal(app.read().students.filter(row => row.email === email).length, 1);

  for (const tables of [
    { registrations: [{ email }] },
    { receipts: [{ studentEmail: email }] },
    { students: [{ ...student, email }], mentors: [{ ...mentor, email }] }
  ]) {
    const existing = harness({ tables });
    assert.equal((await existing.login(googleToken({ email }), details)).status, 409);
    assert.equal(existing.read().links.length, 0);
    assert.equal(existing.registrations.length, 0);
  }
});

test('distributed request limit shares buckets across aliases and instances and fails closed on outage', async () => {
  const settings = {
    ...env, VERCEL: '1', UPSTASH_REDIS_REST_URL: 'https://redis.example.invalid',
    UPSTASH_REDIS_REST_TOKEN: 'fixture-redis-token'
  };
  const counts = new Map();
  const fetchJson = async (_url, options) => {
    const [command, script, number, ...args] = JSON.parse(options.body);
    assert.equal(command, 'EVAL');
    assert.match(script, /EXPIRE/);
    const keys = args.slice(0, number);
    const limits = args.slice(number, number * 2);
    const ttl = args.at(-1);
    for (const [i, key] of keys.entries()) {
      assert.match(key, /^bjs:auth:[a-f0-9]{64}$/);
      if ((counts.get(key) || 0) >= limits[i]) return { ok: true, json: async () => ({ result: ttl }) };
    }
    for (const key of keys) counts.set(key, (counts.get(key) || 0) + 1);
    return { ok: true, json: async () => ({ result: 0 }) };
  };
  const instances = [createAuthRateLimiter({ env: settings, fetchJson }), createAuthRateLimiter({ env: settings, fetchJson })];
  async function run(middleware, route, body = {}) {
    const { res, result } = response();
    await middleware({
      method: 'POST', path: route, body,
      headers: { 'x-vercel-forwarded-for': '192.0.2.9', 'x-forwarded-for': '198.51.100.7' }
    }, res, () => { result.allowed = true; });
    return result;
  }
  for (let i = 0; i < 24; i++) {
    const route = i % 2 ? '/api/auth/mentor/login' : '/api/auth/login';
    assert.equal((await run(instances[i % 2], route, { email: mentor.email, identifier: mentor.email })).allowed, true);
  }
  const limited = await run(instances[0], '/api/auth/login', { identifier: mentor.email });
  assert.equal(limited.status, 429);
  assert.equal(limited.headers['Retry-After'], '600');
  assert.equal((await run(instances[1], '/api/auth/login', { identifier: student.email })).allowed, true);
  const outage = createAuthRateLimiter({ env: settings, fetchJson: async () => { throw new Error('fixture outage'); } });
  assert.equal((await run(outage, '/api/auth/google')).status, 503);
  const unconfigured = createAuthRateLimiter({ env: { ...settings, UPSTASH_REDIS_REST_TOKEN: '' }, fetchJson });
  assert.equal((await run(unconfigured, '/api/auth/google-login')).status, 503);
});
