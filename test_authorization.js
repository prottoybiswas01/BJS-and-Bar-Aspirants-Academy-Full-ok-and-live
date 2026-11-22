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
const { createAuthRateLimiter } = require('./server/services/authRateLimit');

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
  'get /api/student/profile',
  'get /api/student/dashboard-data',
  'post /api/auth/register',
  'get /api/admin/courses',
  'post /api/admin/courses/save',
  'delete /api/lessons/:id',
  'get /api/lessons',
  'get /api/mentor/assignments',
  'get /api/mentor/students',
  'post /api/mentor/grade-submission',
  'get /api/student/receipts',
  'get /api/student/receipts/:receiptId/pdf',
  'get /api/admin/receipts/:receiptId/pdf',
  'post /api/admin/receipts/resend-email/:receiptId',
  'post /api/user/update-email',
  'post /api/admin/receipts/save',
  'get /api/admin/students',
  'get /api/admin/registrations',
  'post /api/admin/students/course-rules',
  'post /api/admin/clear-all-demo-data',
  'get /api/mcq-exams/:id',
  'post /api/mcq-exams/submit',
  'get /api/student/mcq-result/:id',
  'get /api/student/my-submissions',
  'get /api/notes',
  'get /api/notes/:idOrSlug',
  'get /api/certificates/student/:studentId',
  'get /api/certificates/verify/:certificateId',
  'get /api/certificates/:certificateId/download',
  'post /api/admin/certificates/issue',
  'post /api/push/subscribe',
  'post /api/webhooks/resend'
]);
const helpers = new Set([
  'studentRestrictedFields', 'requireStudentOrAdmin', 'ownerQuery', 'readCourseScope', 'requireAdminOnAlias',
  'requireStudentSelf', 'requireMentorSelf', 'optionalAuthentication', 'recordIdFilter', 'loadMentorAssignment',
  'mentorCanAccessCourse', 'studentCanAccessCourse', 'checkStudentCourseAccess', 'assertExamAccess',
  'isPublicExam', 'currentStudentForContactChange', 'applyStudentEmailChallenge',
  'mergeStudentDirectory', 'registrationSessionAccount'
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
  _id: 'fixture-object-a', id: 'STU-A', name: 'Fixture Student A', phone: 'fixture-phone',
  email: 'fixture-a@example.invalid', status: 'Active', loginApproval: 'Approved',
  allowedCourseIds: [courseA.id],
  password: 'fixture-restricted-password', address: 'fixture-restricted-address',
  devices: [{ deviceId: 'fixture-device', ip: 'fixture-private-ip', platform: 'Fixture platform' }]
};
const otherStudent = {
  ...student, _id: 'fixture-object-b', id: 'STU-B', name: 'Fixture Student B',
  allowedCourseIds: [courseB.id], enrolledCourseIds: [courseA.id]
};
const mentor = {
  id: 'MTR-A', name: 'Fixture Mentor', assignedCourseIds: [courseA.id], status: 'Active', loginApproval: 'Approved'
};
const receipts = [
  { receiptId: 'REC-A', studentId: student.id, studentEmail: 'historic@example.invalid', studentPhone: student.phone, amount: 20, trxId: 'fixture-txn' },
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
    if (value?.$in) return [row[key]].flat().some(item => value.$in.some(term => typeof term?.test === 'function' ? term.test(item) : item === term));
    if (value?.$nin) return !value.$nin.includes(row[key]);
    if (value?.$ne !== undefined) return row[key] !== value.$ne;
    if (typeof value?.test === 'function') return value.test(row[key]);
    return row[key] === value;
  });
}

function harness({ lessonError = false, currentMentor = mentor, currentStudent = student, courses = [courseA, courseB], acceptEmailChallenge = false } = {}) {
  const handlers = new Map();
  const effects = { audit: [], writes: [], downloads: [], mailRecipients: [], denied: [], subscriptionFilters: [] };
  const httpAuth = auth.createAuthentication({
    env,
    findStudent: async id => [currentStudent, otherStudent].find(item => item.id === id),
    findMentor: async id => id === currentMentor.id ? currentMentor : null,
    onDenied: (req, code) => effects.denied.push({ method: req.method, code })
  });
  function makeQuery(resolve) {
    const query = {
      sort: () => query, select: () => query, session: () => query, limit: () => query,
      lean: async () => resolve(),
      then: (onResolve, onReject) => query.lean().then(onResolve, onReject)
    };
    return query;
  }
  function model(rows) {
    return {
      find: (filter = {}) => makeQuery(() => rows.filter(row => matches(row, filter))),
      findOne: filter => makeQuery(() => rows.find(row => matches(row, filter))),
      exists: filter => makeQuery(() => rows.some(row => matches(row, filter))),
      async create(data) {
        if (Array.isArray(data)) {
          effects.writes.push(...data);
          return data;
        }
        effects.writes.push(data);
        return { ...data, toObject: () => data };
      },
      deleteMany() { assert.fail('Bulk deletion must remain unreachable'); },
      deleteOne() { assert.fail('Unauthorized deletion must remain unreachable'); }
    };
  }
  const app = Object.fromEntries([...routeMethods].map(method => [method, (paths, ...fn) => {
    for (const route of [paths].flat()) handlers.set(method + ' ' + route, fn);
  }]));
  program.runInNewContext({
    ...auth, ...httpAuth, ...rules, ...fields,
    app, Buffer, URL, isMongoConnected: true, process: { env: { NODE_ENV: 'production', ENABLE_DEMO_DATA_RESET: 'true' } },
    mongoose: {
      connection: { name: 'fixture-production', transaction: async run => run({}) }, isObjectIdOrHexString: () => false,
      isValidObjectId: () => false, Types: { ObjectId: { isValid: () => false } }
    },
    ensureDbConnected: async () => {},
    Course: model(courses),
    Lesson: {
      ...model(lessons),
      find: (filter, projection) => makeQuery(() => {
        if (lessonError) throw new Error('fixture database error');
        return lessons.filter(row => matches(row, filter)).map(row => projection
          ? Object.fromEntries(Object.entries(row).filter(([key]) => projection.split(' ').includes(key))) : row);
      })
    },
    Student: {
      ...model([student, otherStudent]),
      findOneAndUpdate: (filter, update) => makeQuery(() => {
        const matching = [student, otherStudent].find(row => matches(row, filter));
        if (!matching) return null;
        effects.writes.push({ id: matching.id, change: update.$set });
        return { ...matching, ...update.$set };
      })
    },
    Registration: { ...model([{ regId: 'REG-A', name: 'Fixture Applicant', password: 'fixture-restricted-hash' }]), updateOne: async () => {} },
    Mentor: model([mentor]),
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
    Certificate: model([
      { certificateId: 'CERT-A', studentId: student.id, status: 'Valid', studentName: student.name, completionScore: 91,
        courseTitle: courseA.title, verificationUrl: 'fixture-url', studentEmail: student.email },
      { certificateId: 'CERT-B', studentId: otherStudent.id, status: 'Valid', studentName: otherStudent.name },
      { certificateId: 'CERT-REVOKED', studentId: student.id, status: 'Revoked', studentName: student.name }
    ]),
    McqExam: model([
      { id: 'exam-private', status: 'Active', isPublic: false, courseId: courseB.id, questions: [] },
      { id: 'exam-public', status: 'Active', isPublic: true, questions: [{
        id: 'q', questionText: 'Fixture question', options: ['A', 'B'], correctIndex: 1, explanation: 'Private until grading'
      }] }
    ]),
    McqResult: model([
      { id: 'result-a', studentId: student.id, examId: 'exam-public', score: 5, candidatePhone: student.phone, candidateEmail: student.email },
      { id: 'result-b', studentId: otherStudent.id, examId: 'exam-public', score: 10, candidateEmail: student.email }
    ]),
    PushSubscription: {
      async findOneAndUpdate(filter) {
        effects.subscriptionFilters.push(filter);
        if (filter.endpoint.endsWith('/another-account')) throw Object.assign(new Error('fixture duplicate'), { code: 11000 });
        return {};
      }
    },
    StudyNote: {
      ...model([{ id: 'draft', isPublished: false }, { id: 'published', isPublished: true }]),
      findOneAndUpdate: filter => makeQuery(() => filter.isPublished ? null : { id: 'draft', isPublished: false })
    },
    accountChallenges: {
      verify: async input => {
        if (acceptEmailChallenge && input.code === '123456') return { owner: input.owner };
        throw new auth.AuthError('VERIFICATION_FAILED');
      },
      takeEmailChange: async () => ({ originalEmail: student.email })
    },
    bcrypt: { hash: async () => 'fixture-registration-hash' },
    verifyEmailDomainMx: async () => ({ ok: true, cleanEmail: 'new-fixture@example.invalid' }),
    sendRegistrationConfirmEmail: async () => {}, notifyRegistration: () => {},
    invalidateStudentDashboardCache: () => {},
    parseBangladeshTimeToUtc: () => new Date('2026-01-02T01:00:00Z'),
    invalidateAdminBundle: () => {}, logAuditEvent: async data => effects.audit.push(data.action),
    sendMoneyReceiptEmail: async email => { effects.mailRecipients.push(email); return true; }, notifyReceipt: () => {},
    generateReceiptPdf: async document => effects.downloads.push(document.receiptId),
    generateCertificatePdf: async document => {
      effects.downloads.push(document.certificateId);
      return Buffer.from('fixture-pdf');
    },
    fastCache: { get: () => null, set() {}, del() {} }, sortLessons: values => values,
    memoryDb: {
      courses: [], lessons, receipts: [{ receiptId: 'REC-DELETED', studentId: student.id }],
      certificates: [{ certificateId: 'CERT-DELETED', studentId: student.id, status: 'Valid' }],
      assignments: [], students: [], registrations: []
    }
  });

  async function request(method, route, { token: bearer, params = {}, query = {}, body = {}, path: requestPath = route } = {}) {
    const chain = handlers.get(method + ' ' + route);
    assert.ok(chain, 'Expected real route declaration');
    const result = { status: 200, headers: {} };
    const res = {
      status: value => { result.status = value; return res; },
      json: value => { result.body = JSON.parse(JSON.stringify(value)); return res; },
      send: value => { result.body = value; return res; },
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

test('Student profile contains only self-service fields and rejects foreign record selectors', async () => {
  const app = harness();
  const route = '/api/student/profile';
  const valid = await app.request('get', route, { token: studentToken });
  assert.equal(valid.status, 200);
  assert.equal(valid.body.student.id, student.id);
  assert.equal(valid.body.student.email, student.email);
  assert.equal(valid.body.student.devices[0].platform, 'Fixture platform');
  for (const field of ['password', 'address', 'firebaseUid', 'fixture-private-ip', 'fixture-device']) {
    assert.equal(JSON.stringify(valid.body).includes(field), false);
  }
  for (const key of ['studentId', 'userId', 'id', '_id', 'regId']) {
    assert.equal((await app.request('get', route, { token: studentToken, query: { [key]: otherStudent.id } })).status, 403);
  }
  assert.equal((await app.request('get', route)).status, 401);
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

test('contact editing verifies the new address and updates only the canonical account', async () => {
  const app = harness({ acceptEmailChallenge: true });
  const route = '/api/user/update-email';
  const email = 'fixture-change@example.invalid';
  const change = { newEmail: email, otp: '123456' };
  for (const key of ['role', 'isAdmin', 'permissions', 'firebaseUid', 'courseAccess', 'enrollmentStatus', 'paymentStatus', 'certificateStatus', 'approved']) {
    const result = await app.request('post', route, { token: studentToken, body: { ...change, [key]: 'fixture-value' } });
    assert.equal(result.status, 403);
  }
  for (const key of ['id', '_id', 'studentId', 'userId', 'regId']) {
    const result = await app.request('post', route, { token: studentToken, body: { ...change, [key]: otherStudent.id } });
    assert.equal(result.status, 403);
  }
  assert.equal(app.effects.writes.length, 0);
  const result = await app.request('post', route, { token: studentToken, body: change });
  assert.equal(result.status, 200);
  assert.equal(result.body.student.email, email);
  assert.equal(result.body.student.password, undefined);
  assert.equal(app.effects.writes.length, 1);
  assert.equal(app.effects.writes[0].id, student.id);
  assert.equal(app.effects.writes[0].change.email, email);
});

test('receipt list and PDF ownership follow the stored student ID even when contacts match', async () => {
  const app = harness();
  const result = await app.request('get', '/api/student/receipts', { token: studentToken });
  assert.deepEqual(result.body.receipts.map(receipt => receipt.receiptId), ['REC-A']);
  assert.equal(result.body.receipts[0].trxId, 'fixture-txn');
  assert.equal(result.body.receipts[0].studentPhone, undefined);
  assert.equal(result.body.receipts[0].studentEmail, undefined);
  for (const [receiptId, status] of [['REC-B', 403], ['REC-DELETED', 403], ['REC-A', 200]]) {
    assert.equal((await app.request('get', '/api/student/receipts/:receiptId/pdf', { token: studentToken, params: { receiptId } })).status, status);
  }
  assert.deepEqual(app.effects.downloads, ['REC-A']);
});

test('Admin receipt render and resend use live records and the current owner contact', async () => {
  const app = harness();
  const download = '/api/admin/receipts/:receiptId/pdf';
  const resend = '/api/admin/receipts/resend-email/:receiptId';
  const gone = { token: adminToken, params: { receiptId: 'REC-DELETED' } };
  assert.equal((await app.request('get', download, gone)).status, 404);
  assert.equal((await app.request('post', resend, gone)).status, 404);
  const current = { token: adminToken, params: { receiptId: 'REC-A' } };
  assert.equal((await app.request('get', download, current)).status, 200);
  assert.equal((await app.request('post', resend, current)).status, 200);
  assert.deepEqual(app.effects.downloads, ['REC-A']);
  assert.deepEqual(app.effects.mailRecipients, [student.email]);
});

test('Student cannot approve payments, edit courses, or delete video through a non-Admin alias', async () => {
  const app = harness();
  for (const [method, endpoint] of [
    ['post', '/api/admin/receipts/save'], ['post', '/api/admin/courses/save'], ['delete', '/api/lessons/:id'],
    ['post', '/api/admin/students/course-rules'], ['post', '/api/admin/certificates/issue']
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

test('staff directories apply role, validation and bounded projection before disclosure', async () => {
  const app = harness();
  for (const route of ['/api/admin/students', '/api/admin/registrations']) {
    assert.equal((await app.request('get', route)).status, 401);
    assert.equal((await app.request('get', route, { token: studentToken })).status, 403);
    const valid = await app.request('get', route, { token: adminToken, query: { page: '1', pageSize: '1' } });
    assert.equal(valid.status, 200);
    assert.equal(valid.body.pagination.pageSize, 1);
    assert.equal((valid.body.students || valid.body.registrations).length, 1);
    assert.doesNotMatch(JSON.stringify(valid.body), /fixture-restricted|fixture-private-ip/);
    assert.equal((await app.request('get', route, { token: adminToken, query: { pageSize: '201' } })).status, 400);
  }
  const roster = '/api/mentor/students';
  const own = await app.request('get', roster, { token: mentorToken, query: { courseId: 'class-a-old' } });
  assert.equal(own.status, 200);
  assert.deepEqual(own.body.students.map(row => row.id), [student.id]);
  assert.deepEqual(own.body.students[0].allowedCourseIds, [courseA.id]);
  assert.equal(own.body.students[0].email, student.email);
  assert.equal(own.body.students[0].address, undefined);
  assert.equal((await app.request('get', roster, { token: mentorToken, query: { courseId: courseB.id } })).status, 403);
  const search = await app.request('get', roster, { token: mentorToken, query: { search: 'Student B' } });
  assert.deepEqual(search.body.students, []);
});

test('ambiguous legacy course aliases grant neither Mentor roster access nor Student paid access', async () => {
  const shared = 'Shared title';
  const app = harness({
    courses: [{ ...courseA, title: shared }, { ...courseB, title: shared }],
    currentMentor: { ...mentor, assignedCourseIds: [shared] },
    currentStudent: { ...student, allowedCourseIds: [shared] }
  });
  const roster = await app.request('get', '/api/mentor/students', { token: mentorToken });
  assert.deepEqual(roster.body.students, []);
  const video = await app.request('get', '/api/lessons', { token: studentToken });
  assert.equal(video.status, 200);
  assert.equal(video.body.lessons.find(lesson => lesson.id === 'lesson-a').youtubeId, null);
  assert.equal(video.body.lessons.find(lesson => lesson.id === 'lesson-b').youtubeId, null);
});

test('dashboard returns enrolled published content plus scoped private records', async () => {
  const app = harness();
  const route = '/api/student/dashboard-data';
  const own = await app.request('get', route, { token: studentToken, query: { courseId: courseA.id } });
  assert.equal(own.status, 200);
  assert.equal(own.body.selectedCourse.isEnrolled, true);
  assert.deepEqual(own.body.lessons.map(lesson => lesson.id), ['lesson-a']);
  assert.match(own.body.lessons[0].youtubeId, /^bjs_enc_/);
  assert.deepEqual(own.body.receipts.map(receipt => receipt.receiptId), ['REC-A']);
  assert.deepEqual(own.body.results.map(result => result.id), ['result-a']);
  assert.deepEqual(own.body.submissions.map(result => result.id), ['submission-a']);
  assert.equal(own.body.receipts[0].studentPhone, undefined);
  const foreign = await app.request('get', route, { token: studentToken, query: { courseId: courseB.id } });
  assert.equal(foreign.status, 200);
  assert.equal(foreign.body.selectedCourse.isLocked, true);
  assert.equal(foreign.body.lessons.find(lesson => lesson.id === 'lesson-b').youtubeId, null);
  const submissions = await app.request('get', '/api/student/my-submissions', { token: studentToken });
  assert.equal(submissions.status, 200);
  assert.deepEqual(submissions.body.submissions.map(row => row.id), ['submission-a']);
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

test('public certificate verification has a minimal response and never uses stale records', async () => {
  const app = harness();
  const route = '/api/certificates/verify/:certificateId';
  const proof = await app.request('get', route, { params: { certificateId: 'CERT-A' } });
  assert.equal(proof.status, 200);
  assert.equal(proof.headers['Cache-Control'], 'no-store');
  assert.equal(proof.body.certificate.studentName, student.name);
  assert.equal(proof.body.certificate.canDownload, false);
  for (const key of ['studentId', 'studentEmail', 'completionScore', 'verificationUrl', '_id']) {
    assert.equal(proof.body.certificate[key], undefined);
  }
  const owner = await app.request('get', route, { params: { certificateId: 'CERT-A' }, token: studentToken });
  assert.equal(owner.body.certificate.canDownload, true);
  const revoked = await app.request('get', route, { params: { certificateId: 'CERT-REVOKED' } });
  assert.equal(revoked.body.valid, false);
  assert.deepEqual(Object.keys(revoked.body.certificate).sort(), ['certificateId', 'status']);
  assert.equal((await app.request('get', route, { params: { certificateId: 'CERT-DELETED' } })).status, 404);
});

test('certificate download authorizes before rendering a PDF', async () => {
  const app = harness();
  const route = '/api/certificates/:certificateId/download';
  const access = certificateId => app.request('get', route, { token: studentToken, params: { certificateId } });
  for (const id of ['CERT-B', 'CERT-DELETED', 'CERT-REVOKED']) assert.equal((await access(id)).status, 403);
  assert.deepEqual(app.effects.downloads, []);
  assert.equal((await access('CERT-A')).headers['Content-Type'], 'application/pdf');
  assert.deepEqual(app.effects.downloads, ['CERT-A']);
});

test('certificate verification aliases share a bounded privacy-preserving rate limit', async () => {
  const requests = [];
  const limiter = createAuthRateLimiter({
    env: { ...env, UPSTASH_REDIS_REST_URL: 'https://redis.example.invalid', UPSTASH_REDIS_REST_TOKEN: 'fixture-redis' },
    fetchJson: async (_, init) => {
      requests.push(JSON.parse(init.body));
      return { ok: true, json: async () => ({ result: requests.length === 3 ? 45 : 0 }) };
    }
  });
  let accepted = 0;
  let status;
  const res = { setHeader() {}, status(code) { status = code; return this; }, json() {} };
  for (const [method, path] of [['GET', '/verify/CERT-A'], ['HEAD', '/api/certificates/verify/CERT-B'], ['GET', '/verify/CERT-C']]) {
    await limiter({ path, method, headers: {}, socket: { remoteAddress: '192.0.2.1' } }, res, () => { accepted += 1; });
  }
  assert.equal(accepted, 2);
  assert.equal(status, 429);
  assert.deepEqual(requests[0], requests[1]);
  assert.deepEqual(requests[1], requests[2]);
  assert.deepEqual(requests[0].slice(4), [40, 600]);
  assert.doesNotMatch(requests[0][3], /CERT-|192\.0\.2\.1/);
});

test('exam review is owner-scoped and submission cannot override Student identity or grading', async () => {
  const app = harness();
  const review = id => app.request('get', '/api/student/mcq-result/:id', { token: studentToken, params: { id } });
  assert.equal((await review('result-b')).status, 403);
  const mine = await review('result-a');
  assert.equal(mine.status, 200);
  assert.equal(mine.body.result.id, 'result-a');
  assert.equal(mine.body.result.candidateEmail, undefined);
  assert.equal(mine.body.result.candidatePhone, undefined);
  for (const input of [{ score: 100 }, { marksObtained: 100 }, { studentId: otherStudent.id }]) {
    const attempt = await app.request('post', '/api/mcq-exams/submit', {
      token: studentToken, body: { examId: 'exam-public', answers: { q: 1 }, ...input }
    });
    assert.equal(attempt.status, 403);
  }
  assert.equal(app.effects.writes.length, 0);
});

test('registration creates pending records and sends no credentials or contacts in the response', async () => {
  const app = harness();
  const signup = await app.request('post', '/api/auth/register', {
    body: { name: 'Fixture applicant', phone: 'fixture-new-phone', email: 'new-fixture@example.invalid', batch: courseA.id,
      password: 'fixture-new-password', role: 'admin', paymentStatus: 'Paid', loginApproval: 'Approved' }
  });
  assert.equal(signup.status, 200);
  assert.deepEqual(Object.keys(signup.body.student).sort(), ['id', 'status']);
  assert.deepEqual(Object.keys(signup.body.registration).sort(), ['regId', 'status']);
  assert.doesNotMatch(JSON.stringify(signup.body), /fixture-new|fixture-registration-hash|example\.invalid/);
  assert.equal(app.effects.writes.length, 2);
  assert.equal(app.effects.writes[1].loginApproval, 'Pending');
  assert.deepEqual([...app.effects.writes[1].allowedCourseIds], []);
});

test('push subscription ownership is bound to the signed Student account', async () => {
  const app = harness();
  const body = {
    endpoint: 'https://fcm.googleapis.com/own-fixture',
    keys: { p256dh: 'x'.repeat(65), auth: 'x'.repeat(24) }
  };
  const subscribe = body => app.request('post', '/api/push/subscribe', { token: studentToken, body });
  assert.equal((await subscribe({ ...body, studentId: otherStudent.id })).status, 403);
  assert.equal((await subscribe({ ...body, endpoint: 'https://fcm.googleapis.com/another-account' })).status, 409);
  assert.equal((await subscribe(body)).status, 200);
  assert.deepEqual(app.effects.subscriptionFilters.map(filter => filter.studentId), [student.id, student.id]);
});

test('public exam leaderboard preserves ranking and excludes private identity and contact data', async () => {
  const services = fs.readFileSync(path.join(__dirname, 'server/services/academyFeaturesService.js'), 'utf8');
  const node = parse(services).program.body.find(node => node.id?.name === 'getExamLeaderboard');
  const leaderboard = vm.runInNewContext('(' + services.slice(node.start, node.end) + ')', {
    mongoose: { isValidObjectId: () => false }
  });
  const rows = [{ studentId: student.id, candidateName: student.name, candidatePhone: student.phone, candidateEmail: student.email, score: 12 }];
  const query = { select: () => query, sort: () => query, limit: () => query, lean: async () => rows };
  const params = { examId: 'fixture-exam', McqExam: { findOne: () => ({ lean: async () => ({ id: 'fixture-exam' }) }) },
    McqResult: { find: () => query } };
  const open = await leaderboard(params);
  const publicRow = open.leaderboard[0];
  assert.equal(publicRow.rank, 1);
  assert.equal(publicRow.score, 12);
  for (const value of [student.id, student.name, student.phone, student.email]) {
    assert.equal(JSON.stringify(open).includes(value), false);
  }
  const signed = await leaderboard({ ...params, viewer: { role: 'student', id: student.id } });
  assert.notEqual(signed.leaderboard[0].studentName, publicRow.studentName);
  const staff = await leaderboard({ ...params, viewer: { role: 'admin' } });
  assert.equal(staff.leaderboard[0].studentName, student.name);
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
