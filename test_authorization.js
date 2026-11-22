const assert = require('node:assert/strict');
const { createHash, randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { parse } = require('./client/node_modules/@babel/parser');
const auth = require('./server/services/authSecurity');
const rules = require('./server/services/authorization');
const fields = require('./server/services/responseFields');
const { createAccountChallenges } = require('./server/services/accountChallenges');

// Read declarations from the application source. Never import the server entry
// point, which loads local environment files and initializes MongoDB and jobs.
const source = fs.readFileSync(path.join(__dirname, 'server/server.js'), 'utf8');
const nodes = parse(source).program.body;
const routeMethods = new Set(['get', 'post', 'put', 'patch', 'delete', 'all']);
const routes = nodes.flatMap(({ expression: call }) => {
  const method = call?.callee?.property?.name;
  if (call?.callee?.object?.name !== 'app' || !routeMethods.has(method)) return [];
  const [input, ...handlers] = call.arguments;
  const paths = (input.type === 'ArrayExpression' ? input.elements : [input]).map(value => value.value);
  return [{ method, paths, handlers, call }];
});

const selected = new Set([
  'get /api/auth/verify-session',
  'get /api/admin/courses',
  'post /api/admin/courses/save',
  'delete /api/lessons/:id',
  'get /api/lessons',
  'get /api/mentor/assignments',
  'post /api/mentor/grade-submission',
  'get /api/student/receipts',
  'get /api/student/receipts/:receiptId/pdf',
  'post /api/user/update-email',
  'post /api/admin/receipts/save',
  'post /api/admin/clear-all-demo-data',
  'get /api/mcq-exams/:id',
  'get /api/notes',
  'get /api/notes/:idOrSlug',
  'get /api/certificates/student/:studentId',
  'post /api/webhooks/resend'
]);
const helpers = new Set([
  'studentRestrictedFields', 'requireStudentOrAdmin', 'ownerQuery', 'readCourseScope', 'requireAdminOnAlias',
  'requireStudentSelf', 'requireMentorSelf', 'optionalAuthentication', 'recordIdFilter', 'loadMentorAssignment',
  'mentorCanAccessCourse', 'studentCanAccessCourse', 'checkStudentCourseAccess', 'assertExamAccess',
  'isPublicExam', 'currentStudentForContactChange', 'applyStudentEmailChallenge'
]);
const policy = nodes.filter(node => helpers.has(node.id?.name || node.declarations?.[0]?.id?.name));
const declarations = routes.filter(row => row.paths.some(route => selected.has(row.method + ' ' + route))).map(row => row.call);
assert.equal(declarations.length, selected.size);
const program = new vm.Script([...policy, ...declarations].map(node => source.slice(node.start, node.end)).join('\n'),
  { filename: 'server/server.js (isolated authorization routes)' });

const env = {
  JWT_SECRET: randomBytes(32).toString('base64url'),
  ADMIN_USERNAME: 'fixture-operator',
  ADMIN_PASSWORD_HASH: bcrypt.hashSync('fixture-operator-password', 12)
};
const courseA = { id: 'class-a', title: 'Class A', status: 'Active', legacyIds: ['class-a-old'] };
const courseB = { id: 'class-b', title: 'Class B', status: 'Active' };
const student = {
  id: 'STU-A', name: 'Fixture Student A', phone: 'fixture-phone',
  email: 'fixture-a@example.invalid', status: 'Active', loginApproval: 'Approved',
  allowedCourseIds: [courseA.id]
};
const otherStudent = { ...student, id: 'STU-B', name: 'Fixture Student B', allowedCourseIds: [courseB.id] };
const mentor = {
  id: 'MTR-A', name: 'Fixture Mentor', assignedCourseIds: [courseA.id], status: 'Active', loginApproval: 'Approved'
};
const receipts = [
  { receiptId: 'REC-A', studentId: student.id, studentEmail: student.email, amount: 20 },
  { receiptId: 'REC-B', studentId: otherStudent.id, studentEmail: student.email, studentPhone: student.phone, amount: 30 }
];
const lessons = [
  { id: 'lesson-a', title: 'Paid class A', courseId: courseA.id, youtubeId: 'fixture-video-a', status: 'published' },
  { id: 'lesson-b', title: 'Paid class B', courseId: courseB.id, youtubeId: 'fixture-video-b', status: 'published' },
  { id: 'lesson-free', title: 'Orientation', courseId: courseB.id, youtubeId: 'fixture-orientation', status: 'published' },
  { id: 'lesson-draft', title: 'Draft', courseId: courseA.id, youtubeId: 'fixture-unpublished', isDraft: true }
];
const assignments = [
  { id: 'assignment-a', mentorId: mentor.id, courseId: courseA.id, title: 'Owned', totalMarks: 20 },
  { id: 'assignment-b', mentorId: mentor.id, courseId: courseB.id, title: 'Unassigned', totalMarks: 20 },
  { id: 'assignment-other', mentorId: 'MTR-B', courseId: courseA.id, title: 'Another mentor', totalMarks: 20 }
];
const token = (role, id) => auth.signSession({ id, role }, env);
const adminToken = token('admin', auth.ADMIN_IDENTITY.id);
const studentToken = token('student', student.id);
const mentorToken = token('mentor', mentor.id);

function matches(row, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === '$or') return value.some(clause => matches(row, clause));
    if (value?.$in) return value.$in.some(term => typeof term?.test === 'function' ? term.test(row[key]) : row[key] === term);
    return row[key] === value;
  });
}

function harness({ lessonError = false, currentMentor = mentor } = {}) {
  const handlers = new Map();
  const effects = { audit: [], writes: [], downloads: [], denied: [] };
  const httpAuth = auth.createAuthentication({
    env,
    findStudent: async id => [student, otherStudent].find(item => item.id === id),
    findMentor: async id => id === currentMentor.id ? currentMentor : null,
    onDenied: (req, code) => effects.denied.push({ method: req.method, code })
  });
  function makeQuery(resolve) {
    const query = {
      sort: () => query, select: () => query,
      lean: async () => resolve(),
      then: (onResolve, onReject) => query.lean().then(onResolve, onReject)
    };
    return query;
  }
  function model(rows) {
    return {
      find: (filter = {}) => makeQuery(() => rows.filter(row => matches(row, filter))),
      findOne: filter => makeQuery(() => rows.find(row => matches(row, filter))),
      deleteMany() { assert.fail('Bulk deletion must remain unreachable'); },
      deleteOne() { assert.fail('Unauthorized deletion must remain unreachable'); }
    };
  }
  const app = Object.fromEntries([...routeMethods].map(method => [method, (paths, ...fn) => {
    for (const route of [paths].flat()) handlers.set(method + ' ' + route, fn);
  }]));
  program.runInNewContext({
    ...auth, ...httpAuth, ...rules, ...fields,
    app, Buffer, isMongoConnected: true, process: { env: { NODE_ENV: 'production', ENABLE_DEMO_DATA_RESET: 'true' } },
    mongoose: {
      connection: { name: 'fixture-production' }, isObjectIdOrHexString: () => false,
      isValidObjectId: () => false, Types: { ObjectId: { isValid: () => false } }
    },
    ensureDbConnected: async () => {},
    Course: model([courseA, courseB]),
    Lesson: {
      ...model(lessons),
      find: filter => makeQuery(() => {
        if (lessonError) throw new Error('fixture database error');
        return lessons.filter(row => matches(row, filter));
      })
    },
    Student: model([student, otherStudent]), Registration: model([]), Mentor: model([mentor]),
    Assignment: model(assignments),
    Submission: model([
      { id: 'submission-a', assignmentId: 'assignment-a', studentId: student.id },
      { id: 'submission-b', assignmentId: 'assignment-b', studentId: otherStudent.id }
    ]),
    Receipt: { ...model(receipts), create: async data => {
      effects.writes.push({ table: 'receipt', data });
      return { toObject: () => data };
    } },
    Device: model([]),
    Certificate: model([{ certificateId: 'CERT-A', studentId: student.id, status: 'Valid' }]),
    McqExam: model([
      { id: 'exam-private', status: 'Active', isPublic: false, courseId: courseB.id, questions: [] },
      { id: 'exam-public', status: 'Active', isPublic: true, questions: [{
        id: 'q', questionText: 'Fixture question', options: ['A', 'B'], correctIndex: 1, explanation: 'Private until grading'
      }] }
    ]),
    StudyNote: {
      ...model([{ id: 'draft', isPublished: false }, { id: 'published', isPublished: true }]),
      findOneAndUpdate: filter => makeQuery(() => filter.isPublished ? null : { id: 'draft', isPublished: false })
    },
    accountChallenges: { verify: async () => { throw new auth.AuthError('VERIFICATION_FAILED'); } },
    parseBangladeshTimeToUtc: () => new Date('2026-01-02T01:00:00Z'),
    invalidateAdminBundle: () => {}, logAuditEvent: async data => effects.audit.push(data.action),
    sendMoneyReceiptEmail: async () => {}, notifyReceipt: () => {},
    generateReceiptPdf: async document => effects.downloads.push(document.receiptId),
    fastCache: { get: () => null, set() {}, del() {} }, sortLessons: values => values,
    memoryDb: { courses: [], lessons, receipts: [], assignments: [] }
  });

  async function request(method, route, { token: bearer, params = {}, query = {}, body = {}, path: requestPath = route } = {}) {
    const chain = handlers.get(method + ' ' + route);
    assert.ok(chain, 'Expected real route declaration');
    const result = { status: 200, headers: {} };
    const res = {
      status: value => { result.status = value; return res; },
      json: value => { result.body = JSON.parse(JSON.stringify(value)); return res; },
      setHeader: (name, value) => { result.headers[name] = value; },
      vary: () => {}, get headersSent() { return false; }
    };
    const req = {
      method: method.toUpperCase(), path: requestPath, params, query, body,
      headers: { authorization: bearer ? 'Bearer ' + bearer : undefined }, get: () => undefined
    };
    async function invoke(index) {
      let downstream;
      await chain[index](req, res, () => {
        downstream = invoke(index + 1);
        return downstream;
      });
      await downstream;
    }
    await invoke(0);
    return result;
  }
  return { request, effects };
}

test('every Admin route and every non-public mutation has an explicit guard', () => {
  const explicitlyPublic = [
    '/api/auth/register', '/api/auth/mentor/register', '/api/auth/mentor/login', '/api/auth/login',
    '/api/auth/google', '/api/auth/forgot-password', '/api/auth/verify-otp', '/api/auth/reset-password', '/api/webhooks/resend'
  ];
  for (const route of routes) {
    const middleware = route.handlers.slice(0, -1).map(node => node.name || node.callee?.name);
    if (route.paths.some(value => /^\/(api\/)?admin\//.test(value))) {
      assert.ok(middleware.some(name => ['requireAdmin', 'requireAdminOnAlias', 'requireTranscriptOperator'].includes(name)),
        'Missing Admin guard at line ' + route.call.loc.start.line);
    }
    if (route.method !== 'get' && !route.paths.some(value => explicitlyPublic.includes(value))) {
      assert.ok(middleware.length > 0, 'Unexpected unguarded mutation at line ' + route.call.loc.start.line);
    }
  }
});

test('unauthenticated direct Admin API requests receive 401', async () => {
  const result = await harness().request('get', '/api/admin/courses');
  assert.equal(result.status, 401);
});

test('both signed Student and Mentor sessions are forbidden on Admin APIs', async () => {
  const app = harness();
  for (const token of [studentToken, mentorToken]) {
    assert.equal((await app.request('get', '/api/admin/courses', { token })).status, 403);
  }
  assert.deepEqual(app.effects.denied.map(event => event.code), ['FORBIDDEN', 'FORBIDDEN']);
});

test('trusted Admin can read information through the Admin alias', async () => {
  const result = await harness().request('get', '/api/admin/courses', { token: adminToken });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.courses.map(course => course.id), [courseA.id, courseB.id]);
});

test('Student session returns its own profile despite a different requested ID', async () => {
  const result = await harness().request('get', '/api/auth/verify-session', {
    token: studentToken, query: { studentId: otherStudent.id, role: 'admin' }
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.student.id, student.id);
  assert.equal(result.body.student.role, 'student');
  assert.equal(result.body.student.isAdmin, false);
});

test('Student cannot change another profile, set permissions or bypass email verification', async () => {
  const app = harness();
  const route = '/api/user/update-email';
  for (const body of [{ studentId: otherStudent.id }, { id: otherStudent.id }, { role: 'admin' }, { allowedCourseIds: ['all'] }]) {
    assert.equal((await app.request('post', route, { token: studentToken, body })).status, 403);
  }
  const mine = await app.request('post', route, { token: studentToken, body: { email: 'fixture-new@example.invalid' } });
  assert.equal(mine.status, 400);
  assert.equal(mine.body.code, 'VERIFICATION_FAILED');
  assert.deepEqual(app.effects.writes, []);
});

test('receipt list and PDF ownership follow the stored student ID even when contacts match', async () => {
  const app = harness();
  const result = await app.request('get', '/api/student/receipts', { token: studentToken });
  assert.deepEqual(result.body.receipts.map(receipt => receipt.receiptId), ['REC-A']);
  for (const [receiptId, status] of [['REC-B', 403], ['REC-A', 200]]) {
    assert.equal((await app.request('get', '/api/student/receipts/:receiptId/pdf', { token: studentToken, params: { receiptId } })).status, status);
  }
  assert.deepEqual(app.effects.downloads, ['REC-A']);
});

test('Student cannot approve payments, edit courses, or delete video through a non-Admin alias', async () => {
  const app = harness();
  for (const [method, endpoint] of [
    ['post', '/api/admin/receipts/save'], ['post', '/api/admin/courses/save'], ['delete', '/api/lessons/:id']
  ]) {
    const result = await app.request(method, endpoint, { token: studentToken, body: { isAdmin: true }, params: { id: 'lesson-a' } });
    assert.equal(result.status, 403);
  }
  assert.deepEqual(app.effects.writes, []);
});

test('payment amount validation rejects invalid amounts and accepted receipts use the stored owner', async () => {
  const app = harness();
  const route = '/api/admin/receipts/save';
  for (const amount of [0, '-500', 'invalid', '1.234']) {
    const denied = await app.request('post', route, { token: adminToken, body: { studentId: student.id, amount } });
    assert.equal(denied.status, 400);
  }
  const approved = await app.request('post', route, {
    token: adminToken, body: { receiptId: 'REC-NEW', studentId: student.id, amount: '200.25', studentEmail: 'spoof@example.invalid' }
  });
  assert.equal(approved.status, 200);
  assert.equal(approved.body.receipt.studentEmail, student.email);
  assert.equal(approved.body.receipt.amount, 200.25);
  assert.deepEqual(app.effects.audit, ['PAYMENT_APPROVE']);
  assert.equal(app.effects.writes.length, 1);
});

test('Mentor sees owned assignments only for their assigned courses', async () => {
  const app = harness();
  const route = '/api/mentor/assignments';
  const response = await app.request('get', route, { token: mentorToken });
  assert.deepEqual(response.body.assignments.map(item => item.id), ['assignment-a']);
  for (const query of [{ mentorId: 'MTR-B' }, { courseId: courseB.id }]) {
    assert.equal((await app.request('get', route, { token: mentorToken, query })).status, 403);
  }
  const pending = harness({ currentMentor: { ...mentor, loginApproval: 'Pending' } });
  assert.equal((await pending.request('get', route, { token: mentorToken })).status, 403);
});

test('Mentor cannot grade submissions outside their authorized classroom', async () => {
  const result = await harness().request('post', '/api/mentor/grade-submission',
    { token: mentorToken, body: { submissionId: 'submission-b', marksObtained: 15 } });
  assert.equal(result.status, 403);
});

test('Paid video IDs are scoped, draft lessons stay private and DB errors cannot serve raw cache', async () => {
  for (const token of [studentToken, mentorToken, undefined]) {
    const result = await harness().request('get', '/api/lessons', { token });
    assert.equal(result.status, 200);
    assert.equal(result.body.lessons.find(lesson => lesson.id === 'lesson-b').youtubeId, null);
    assert.equal(result.body.lessons.some(lesson => lesson.id === 'lesson-draft'), false);
    assert.match(result.body.lessons.find(lesson => lesson.id === 'lesson-free').youtubeId, /^bjs_enc_/);
    if (token) assert.match(result.body.lessons.find(lesson => lesson.id === 'lesson-a').youtubeId, /^bjs_enc_/);
  }
  const failed = await harness({ lessonError: true }).request('get', '/api/lessons', { token: studentToken });
  assert.equal(failed.status, 503);
  assert.equal(JSON.stringify(failed).includes(lessons[0].youtubeId), false);
});

test('course-bound exam access is enforced and the public exam response excludes its answer key', async () => {
  const app = harness();
  const route = '/api/mcq-exams/:id';
  assert.equal((await app.request('get', route, { params: { id: 'exam-private' } })).status, 401);
  assert.equal((await app.request('get', route, { params: { id: 'exam-private' }, token: studentToken })).status, 403);
  const open = await app.request('get', route, { params: { id: 'exam-public' } });
  assert.deepEqual(open.body.exam.questions[0], { id: 'q', questionText: 'Fixture question', options: ['A', 'B'] });
});

test('public note draft flags and another student’s certificate ID cannot override access', async () => {
  const app = harness();
  const notes = await app.request('get', '/api/notes', { query: { includeDrafts: 'true', all: 'true' } });
  assert.deepEqual(notes.body.notes.map(note => note.id), ['published']);
  const draft = await app.request('get', '/api/notes/:idOrSlug', { params: { idOrSlug: 'draft' } });
  assert.equal(draft.status, 404);
  const other = await app.request('get', '/api/certificates/student/:studentId', {
    token: studentToken, params: { studentId: otherStudent.id }
  });
  assert.equal(other.status, 403);
});

test('expired JWTs are rejected before protected handlers run', async () => {
  const session = jwt.sign({ role: 'admin', id: auth.ADMIN_IDENTITY.id }, env.JWT_SECRET,
    { algorithm: 'HS256', issuer: 'https://bjs.kodl.uk', audience: 'bjs-academy', expiresIn: -1 });
  const denied = await harness().request('get', '/api/admin/courses', { token: session });
  assert.equal(denied.status, 401);
  assert.equal(denied.body.code, 'SESSION_EXPIRED');
});

test('Admin production demo reset is denied even with the opt-in switch enabled', async () => {
  const result = await harness().request('post', '/api/admin/clear-all-demo-data', { token: adminToken });
  assert.equal(result.status, 403);
});

test('unsigned Resend webhook cannot write suppression state', async () => {
  const result = await harness().request('post', '/api/webhooks/resend', { body: { type: 'email.bounced' } });
  assert.equal(result.status, 503);
  assert.equal(result.body.code, 'AUTH_UNAVAILABLE');
});

test('service credentials use exact secrets, and unknown permissions deny by default', async () => {
  const secret = randomBytes(32).toString('base64url');
  assert.doesNotThrow(() => rules.verifyServiceSecret(secret, secret));
  assert.throws(() => rules.verifyServiceSecret(secret, createHash('sha256').update(secret).digest('hex')), { code: 'SESSION_INVALID' });
  const localAuth = auth.createAuthentication({ env, findStudent: async () => student, findMentor: async () => mentor });
  const body = {};
  const res = { setHeader() {}, status(status) { body.status = status; return this; }, json() {} };
  await localAuth.requirePermission('unknown')({ headers: { authorization: 'Bearer ' + adminToken } }, res, () => assert.fail());
  assert.equal(body.status, 403);
});

test('password recovery stores hashed challenges and denies replay of a consumed reset grant', async () => {
  let value;
  const collection = {
    async updateOne(filter, update) {
      value = { ...value, _id: filter._id, ...update.$set };
      for (const key of Object.keys(update.$unset || {})) delete value[key];
      return { modifiedCount: 1 };
    },
    async findOneAndUpdate(filter) {
      if (!value?.otpHash || value._id !== filter._id || value.email !== filter.email) return null;
      return { ...value, attempts: ++value.attempts };
    },
    async findOneAndDelete(filter) {
      if (!value || value._id !== filter._id || value.email !== filter.email || value.resetHash !== filter.resetHash) return null;
      const previous = value;
      value = undefined;
      return previous;
    }
  };
  const challenges = createAccountChallenges({ collection: () => collection, secret: () => env.JWT_SECRET });
  const params = { purpose: 'password-reset', owner: student.id, email: student.email };
  const code = await challenges.issue(params);
  assert.equal(JSON.stringify(value).includes('"otp":'), false);
  const verified = await challenges.verify({ ...params, code });
  const resetToken = await challenges.permitReset(verified);
  assert.equal(JSON.stringify(value).includes(resetToken), false);
  await challenges.takeReset(params.owner, params.email, resetToken, {});
  await assert.rejects(challenges.takeReset(params.owner, params.email, resetToken, {}), { code: 'VERIFICATION_FAILED' });
});
