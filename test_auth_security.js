const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('./server/services/authSecurity');
const fields = require('./server/services/responseFields');
const authorization = require('./server/services/authorization');

// Evaluate the actual route declarations with fixture dependencies. Loading the
// server entry point would load dotenv, connect to MongoDB and initialize jobs.
const server = fs.readFileSync(path.join(__dirname, 'server/server.js'), 'utf8').replace(/\r\n/g, '\n');
function section(first, next) {
  const start = server.indexOf(first);
  const end = server.indexOf(next, start + first.length);
  assert.ok(start >= 0 && end > start, 'Expected server route section');
  return server.slice(start, end);
}
const authRoutes = new vm.Script([
  section('function sanitizeData(', '// 3. Sliding Window IP Rate Limiter'),
  section('function registrationSessionAccount(', '// SECURE AUDIT LOGGING ENGINE'),
  section('function validPasswordLogin(', '// 3. Multi-Identifier Instant Login'),
  section('app.post("/api/auth/login"', 'const googleLoginHandlers'),
  section('// Resend Verification & Diagnostic Test Endpoint', '// RESEND BOUNCE'),
  section('app.get(["/api/home-data"', '// GET All Courses'),
  section('// Mail preferences for the Admin Panel.', '// GET MCQ Exams')
].join('\n'), { filename: 'server/server.js (isolated routes)' });

const adminPassword = '  synthetic:<script>pass</script>  ';
const mentorPassword = 'fixture-mentor-pass';
const studentPassword = 'fixture-student-pass';
const accountHash = bcrypt.hashSync(mentorPassword, 4);
const fixtureEnv = {
  JWT_SECRET: randomBytes(32).toString('base64url'),
  JWT_ISSUER: 'https://example.invalid',
  JWT_AUDIENCE: 'academy-test',
  ADMIN_USERNAME: 'fixture-admin',
  ADMIN_PASSWORD_HASH: bcrypt.hashSync(adminPassword, 12)
};
const student = {
  id: 'STU-FIXTURE', name: 'Fixture Student', email: 'student@example.invalid', password: studentPassword,
  allowedCourseIds: ['course-fixture'], accessVersion: 2, status: 'Active'
};
const mentor = {
  id: 'MTR-FIXTURE', name: 'Fixture Mentor', email: 'mentor@example.invalid', password: accountHash,
  assignedCourseIds: ['course-fixture'], loginApproval: 'Approved', status: 'Active'
};
const registration = {
  regId: 'REG-FIXTURE', name: 'Fixture Registration', email: 'registration@example.invalid',
  password: 'fixture-registration-pass', status: 'Approved'
};
const settingsFixture = {
  badgeText: 'Fixture badge', heroTitle: 'Fixture headline', heroSubtitle: 'Fixture subtitle',
  adminUsername: 'obsolete-fixture-login', adminPassword: 'fixture-private',
  jwtSecret: 'fixture-private', resendApiKey: 'fixture-private', telegramToken: 'fixture-private'
};

function query(value) {
  return { lean: async () => value, sort: () => query(value), then: (resolve, reject) => Promise.resolve(value).then(resolve, reject) };
}

function accountModel(accounts) {
  return {
    find: () => query(accounts),
    countDocuments: async () => accounts.length,
    findOne(filter) {
      const terms = filter.$or || [filter];
      return query(accounts.find(account => terms.some(term => Object.entries(term).every(
        ([key, value]) => typeof value?.test === 'function' ? value.test(account[key] || '') : account[key] === value
      ))));
    },
    create: async () => assert.fail('No account creation expected')
  };
}

function harness({ env: overrides = {}, connected = true, cache = [], studentRows = [student] } = {}) {
  const env = { ...fixtureEnv, ...overrides };
  const routes = new Map();
  const middleware = [];
  const register = method => (paths, ...handlers) => {
    for (const url of [paths].flat()) routes.set(method + ' ' + url, handlers);
  };
  const savedSettings = [];
  const notifications = [];
  let mailSends = 0;
  const cacheStore = new Map(cache);
  authRoutes.runInNewContext({
    ...auth,
    ...fields,
    ...authorization,
    createAuthentication: config => auth.createAuthentication({ ...config, env }),
    isAdminIdentifier: identifier => auth.isAdminIdentifier(identifier, env),
    signSession: claims => auth.signSession(claims, env),
    verifyAdminCredentials: (name, password) => auth.verifyAdminCredentials(name, password, env),
    process: { env },
    app: { use: handler => middleware.push(handler), get: register('GET'), post: register('POST') },
    isMongoConnected: connected,
    ensureDbConnected: async () => {},
    mongoose: { Types: { ObjectId: { isValid: () => false } } },
    Student: accountModel(studentRows),
    Mentor: accountModel([mentor]),
    Registration: accountModel([registration]),
    Course: { find: () => query([{ id: 'course-fixture' }]) },
    SiteSetting: {
      findOne: () => query(settingsFixture),
      findOneAndUpdate(filter, update) {
        savedSettings.push(JSON.parse(JSON.stringify(update.$set)));
        return query({ ...settingsFixture, ...update.$set });
      }
    },
    MailSetting: { findOne: () => query({ enabled: true, resendApiKey: 'fixture-private' }) },
    getResendClient: () => ({ emails: { async send() {
      mailSends += 1;
      return { data: { id: 'fixture-email-id' }, headers: { authorization: 'fixture-private' } };
    } } }),
    OFFICIAL_RESEND_SENDER: 'fixture@example.invalid',
    siteSettingsProjection: fields.SITE_FIELDS.join(' '),
    fastCache: { get: key => cacheStore.get(key), set: (key, value) => cacheStore.set(key, value), del: key => cacheStore.delete(key) },
    memoryDb: { siteSettings: settingsFixture, mailSettings: {}, courses: [{ id: 'course-fixture' }], mentors: [mentor] },
    bcrypt,
    notifyStudentLogin: async (account, method) => notifications.push([account.id, method]),
    invalidateAdminBundle: () => {},
    logAuditEvent: async () => {}
  });

  async function request(method, url, { body, token, authorization, query: params } = {}) {
    const route = routes.get(method + ' ' + url);
    assert.ok(route, 'Expected route registration');
    const handlers = [...middleware, ...route];
    const header = authorization ?? (token && 'Bearer ' + token);
    const req = { path: url, body, query: params || {}, headers: { authorization: header } };
    const response = { status: 200, headers: {} };
    const res = {
      setHeader: (name, value) => { response.headers[name] = value; },
      status: code => { response.status = code; return res; },
      json: value => { response.body = JSON.parse(JSON.stringify(value)); return res; }
    };
    async function run(index) {
      let downstream;
      await handlers[index](req, res, () => {
        downstream = run(index + 1);
        return downstream;
      });
      await downstream;
    }
    await run(0);
    return response;
  }

  return { request, savedSettings, notifications, get mailSends() { return mailSends; } };
}

const sign = (role, id, env = fixtureEnv) => auth.signSession({ role, id }, env);
const verify = (app, token, options = {}) => app.request('GET', '/api/auth/verify-session', { token, ...options });
const adminLogin = (app, body = {}) => app.request('POST', '/api/auth/login', {
  body: { identifier: fixtureEnv.ADMIN_USERNAME, password: adminPassword, isAdminPortal: true, ...body }
});

test('configured admin login and protected settings write require server-issued admin identity', async () => {
  const app = harness();
  const result = await adminLogin(app);
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.user, auth.ADMIN_IDENTITY);
  const claims = jwt.decode(result.body.token, { complete: true });
  assert.equal(claims.header.alg, 'HS256');
  assert.equal(claims.payload.exp - claims.payload.iat, 86400);
  assert.equal(claims.payload.iss, fixtureEnv.JWT_ISSUER);
  assert.equal(claims.payload.aud, fixtureEnv.JWT_AUDIENCE);
  const updated = await app.request('POST', '/api/admin/site-settings', {
    token: result.body.token,
    body: { heroTitle: 'Updated fixture', adminPassword: 'ignored-fixture' }
  });
  assert.equal(updated.status, 200);
  assert.deepEqual(app.savedSettings, [{ heroTitle: 'Updated fixture' }]);
  assert.deepEqual(Object.keys(updated.body.settings).sort(), [...fields.SITE_FIELDS].sort());
  assert.equal((await verify(app, result.body.token)).headers['Cache-Control'], 'no-store');
});

test('wrong admin username and password have the same response', async () => {
  const app = harness();
  const wrongName = await adminLogin(app, { identifier: 'different-fixture' });
  const wrongPass = await adminLogin(app, { password: 'wrong-fixture' });
  assert.equal(wrongName.status, 401);
  assert.equal(wrongName.body.code, 'INVALID_CREDENTIALS');
  assert.deepEqual(wrongName, wrongPass);
});

test('missing authentication ignores caller-provided identity and role flags', async () => {
  const result = await verify(harness(), undefined, { query: { id: student.id, isAdmin: true } });
  assert.equal(result.status, 401);
  assert.equal(result.body.code, 'SESSION_REQUIRED');
});

test('expired, malformed, forged and disallowed algorithm tokens fail with controlled 401s', async () => {
  const app = harness();
  const claims = { id: student.id, role: 'student', iss: fixtureEnv.JWT_ISSUER, aud: fixtureEnv.JWT_AUDIENCE };
  const cases = [
    [jwt.sign(claims, fixtureEnv.JWT_SECRET, { expiresIn: -1 }), 'SESSION_EXPIRED'],
    ['not-a-jwt', 'SESSION_INVALID'],
    [jwt.sign(claims, randomBytes(32), { expiresIn: 120 }), 'SESSION_INVALID'],
    [jwt.sign(claims, fixtureEnv.JWT_SECRET, { algorithm: 'HS384', expiresIn: 120 }), 'SESSION_INVALID']
  ];
  for (const [token, code] of cases) {
    const result = await verify(app, token);
    assert.equal(result.status, 401);
    assert.equal(result.body.code, code);
  }
  assert.equal((await verify(app, undefined, { authorization: ['Bearer x', 'Bearer y'] })).status, 401);
});

test('tokens require the configured issuer, audience, expiry and canonical admin identity', async () => {
  const app = harness();
  const claims = { id: student.id, role: 'student', iss: fixtureEnv.JWT_ISSUER, aud: fixtureEnv.JWT_AUDIENCE };
  for (const changes of [{ iss: 'invalid-issuer' }, { aud: 'invalid-audience' }]) {
    assert.equal((await verify(app, jwt.sign({ ...claims, ...changes }, fixtureEnv.JWT_SECRET, { expiresIn: 120 }))).status, 401);
  }
  assert.equal((await verify(app, jwt.sign(claims, fixtureEnv.JWT_SECRET))).status, 401);
  assert.equal((await verify(app, sign('admin', 'WRONG-ID'))).status, 401);
});

test('student and mentor tokens cannot write admin settings', async () => {
  const app = harness();
  for (const principal of [student, mentor]) {
    const token = sign(principal === student ? 'student' : 'mentor', principal.id);
    const result = await app.request('POST', '/api/admin/site-settings', { token, body: { heroTitle: 'Denied' } });
    assert.equal(result.status, 403);
    assert.equal(result.body.code, 'FORBIDDEN');
  }
  assert.deepEqual(app.savedSettings, []);
});

test('public settings strip credentials from database, cached and offline responses', async () => {
  const expected = Object.fromEntries(fields.SITE_FIELDS.map(key => [key, settingsFixture[key]]));
  const cases = [
    {},
    { cache: [['site_settings', settingsFixture], ['home_data', { settings: settingsFixture }]] },
    { connected: false }
  ];
  for (const options of cases) {
    const app = harness(options);
    for (const url of ['/api/site-settings', '/api/home-data']) {
      const response = await app.request('GET', url);
      assert.equal(response.status, 200);
      assert.deepEqual(response.body.settings, expected);
      if (response.body.mentors?.length) assert.equal(Object.hasOwn(response.body.mentors[0], 'password'), false);
    }
    assert.equal((await app.request('GET', '/api/admin/site-settings')).status, 401);
    const admin = sign('admin', auth.ADMIN_IDENTITY.id);
    const settings = await app.request('GET', '/api/admin/site-settings', { token: admin });
    assert.equal(settings.status, 200);
    assert.deepEqual(settings.body.settings, expected);
  }
});

test('mail credentials stay out of protected settings responses', async () => {
  const app = harness();
  const token = sign('admin', auth.ADMIN_IDENTITY.id);
  const result = await app.request('GET', '/api/admin/mail-settings', { token });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.settings, { enabled: true });
});

test('mail diagnostics require admin authorization and return no provider details', async () => {
  const app = harness();
  const body = { targetEmail: 'mail@example.invalid', apiKey: 'fixture-resend' };
  const diagnose = token => app.request('POST', '/api/admin/test-resend', { token, body });
  assert.equal((await diagnose()).status, 401);
  assert.equal((await diagnose(sign('student', student.id))).status, 403);
  assert.equal(app.mailSends, 0);
  const result = await diagnose(sign('admin', auth.ADMIN_IDENTITY.id));
  assert.equal(result.status, 200);
  assert.deepEqual(Object.keys(result.body).sort(), ['message', 'ok']);
  assert.equal(app.mailSends, 1);
});

test('student, registration-only, and mentor password authentication remains usable', async () => {
  const app = harness();
  for (const [account, password] of [[student, studentPassword], [registration, registration.password], [mentor, mentorPassword]]) {
    const login = await app.request('POST', '/api/auth/login', { body: { identifier: account.email, password } });
    assert.equal(login.status, 200);
    assert.equal(Object.hasOwn(login.body.student, 'password'), false);
    const claims = jwt.decode(login.body.token);
    assert.equal(claims.exp - claims.iat, 604800);
    const session = await verify(app, login.body.token, { query: { id: 'other-fixture' } });
    assert.equal(session.status, 200);
    if (account !== mentor) {
      assert.equal(session.body.student.id, account.id || account.regId);
      assert.equal(Object.hasOwn(session.body.student, 'password'), false);
    }
  }
  const dedicated = await app.request('POST', '/api/auth/mentor/login', { body: { email: mentor.email, password: mentorPassword } });
  assert.equal(dedicated.status, 200);
  assert.equal(Object.hasOwn(dedicated.body.mentor, 'password'), false);
  assert.equal(app.notifications.length, 2);
});

test('session requires an active account from the authoritative data source', async () => {
  const token = sign('student', student.id);
  for (const studentRows of [[], [{ ...student, status: 'Blocked' }]]) {
    assert.equal((await verify(harness({ studentRows }), token)).status, 401);
  }
  assert.equal((await verify(harness({ connected: false }), token)).status, 503);
});

test('legacy grace is bounded, explicit, and only accepts existing student or mentor signatures', async () => {
  const deadline = ms => new Date(Date.now() + ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
  const fixture = (role, id) => jwt.sign({ role, id }, fixtureEnv.JWT_SECRET, { expiresIn: 120 });
  const oneMinute = deadline(60000);
  const grace = harness({ env: { JWT_LEGACY_ACCEPT_UNTIL: oneMinute } });
  assert.equal((await verify(grace, fixture('mentor', mentor.id))).status, 200);
  assert.equal((await verify(grace, fixture('student', student.id))).status, 200);
  assert.equal((await verify(grace, fixture('admin', auth.ADMIN_IDENTITY.id))).status, 401);
  for (const env of [
    {},
    { JWT_LEGACY_ACCEPT_UNTIL: deadline(-60000) },
    { JWT_LEGACY_ACCEPT_UNTIL: deadline(8 * 86400000) },
    { JWT_LEGACY_ACCEPT_UNTIL: oneMinute, JWT_SECRET: randomBytes(32).toString('base64url') }
  ]) {
    assert.equal((await verify(harness({ env }), fixture('student', student.id))).status, 401);
  }
});

test('missing or weak server authentication configuration fails securely', async () => {
  for (const env of [{ JWT_SECRET: '' }, { JWT_SECRET: 'x'.repeat(64) }, { ADMIN_PASSWORD_HASH: '' }, { ADMIN_USERNAME: '' }]) {
    const result = await adminLogin(harness({ env }));
    assert.equal(result.status, 503);
    assert.equal(result.body.code, 'AUTH_UNAVAILABLE');
    assert.deepEqual(Object.keys(result.body).sort(), ['code', 'message', 'ok']);
  }
});
