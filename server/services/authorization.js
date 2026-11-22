const { createHash, timingSafeEqual } = require('node:crypto');
const { AuthError } = require('./authSecurity');

const IDENTITY_FIELDS = ['id', 'regId', '_id'];
const STUDENT_TARGET_FIELDS = ['studentId', 'userId', ...IDENTITY_FIELDS];
const STUDENT_PRIVILEGE_FIELDS = [
  'role', 'isAdmin', 'isMentor', 'permissions', 'accountType', 'firebaseUid', 'approved', 'loginApproval', 'status',
  'paymentStatus', 'paymentAmount', 'enrollmentStatus', 'certificateStatus', 'certificateOwner', 'courseAccess',
  'allowedCourseIds', 'enrolledCourseIds', 'assignedCourseIds', 'courseRules', 'unlimitedAccess', 'marksObtained',
  'score', 'netScore', 'grade', 'studentRole'
];

function accountIds(account) {
  return IDENTITY_FIELDS.map(field => account?.[field]).filter(Boolean).map(String);
}

function isAccountId(account, id) {
  return typeof id === 'string' && accountIds(account).includes(id);
}

function ownsStudentRecord(student, row) {
  if (student.role !== 'student') return false;
  return row?.studentId != null && isAccountId(student, String(row.studentId));
}

function validateStudentTarget(student, ...inputs) {
  for (const input of inputs) {
    if (!input) continue;
    if (STUDENT_TARGET_FIELDS.some(field => Object.hasOwn(input, field) && !isAccountId(student, input[field])) ||
        STUDENT_PRIVILEGE_FIELDS.some(field => Object.hasOwn(input, field))) throw new AuthError('FORBIDDEN');
  }
}

function validateStudentFields(input, fields) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new AuthError('INVALID_INPUT');
  if (Object.keys(input).some(field => !fields.includes(field) && !STUDENT_TARGET_FIELDS.includes(field))) {
    throw new AuthError('FORBIDDEN');
  }
}

function readDirectoryQuery({ page = '1', pageSize = '50', search = '' } = {}) {
  const readNumber = value => typeof value === 'string' && /^[1-9]\d*$/.test(value) ? Number(value) : NaN;
  const index = readNumber(page);
  const size = readNumber(pageSize);
  if (!Number.isSafeInteger(index) || !Number.isSafeInteger(size) || size > 200 ||
      !Number.isSafeInteger((index - 1) * size) || typeof search !== 'string' || search.length > 120) {
    throw new AuthError('INVALID_INPUT');
  }
  return { page: index, pageSize: size, search: search.trim().toLowerCase() };
}

function directoryPage(rows, query) {
  const found = query.search ? rows.filter(row => [row.id, row.regId, row.name, row.phone, row.email]
    .some(value => typeof value === 'string' && value.toLowerCase().includes(query.search))) : rows;
  const start = (query.page - 1) * query.pageSize;
  return {
    records: found.slice(start, start + query.pageSize),
    pagination: { page: query.page, pageSize: query.pageSize, total: found.length, hasMore: start + query.pageSize < found.length }
  };
}

const normalizeCourseId = id => String(id ?? '').trim().toLowerCase().replace(/[-_]/g, ' ');

function courseAliases(course) {
  return [course?.id, course?._id, course?.title, course?.shortTitle, ...(course?.legacyIds || [])].filter(Boolean);
}

function findScopedCourse(courses, id) {
  const key = normalizeCourseId(id);
  if (!key) return null;
  const matches = courses.filter(course => courseAliases(course).map(normalizeCourseId).includes(key));
  return matches.length === 1 ? matches[0] : null;
}

function courseScopeAliases(course, catalog) {
  if (!course) return [];
  return courseAliases(course).filter(alias => {
    const resolved = findScopedCourse(catalog, alias);
    return resolved && String(resolved.id || resolved._id) === String(course.id || course._id);
  });
}

function mentorAssignedCourse(mentor, course, catalog) {
  if (mentor?.role !== 'mentor' || mentor.loginApproval !== 'Approved' || mentor.status !== 'Active') return false;
  const candidates = courseScopeAliases(course, catalog).map(normalizeCourseId);
  return (mentor.assignedCourseIds || []).some(id => candidates.includes(normalizeCourseId(id)));
}

function pickWritableFields(input, allowed) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new AuthError('INVALID_INPUT');
  return Object.fromEntries(allowed.filter(key => Object.hasOwn(input, key)).map(key => [key, input[key]]));
}

function verifyServiceSecret(expected, supplied) {
  if (typeof expected !== 'string' || !expected.trim()) throw new AuthError('AUTH_UNAVAILABLE');
  if (typeof supplied !== 'string' || !supplied || supplied.length > 4096) throw new AuthError('SESSION_REQUIRED');
  const digest = value => createHash('sha256').update(value).digest();
  if (!timingSafeEqual(digest(expected), digest(supplied))) throw new AuthError('SESSION_INVALID');
}

module.exports = {
  accountIds, isAccountId, ownsStudentRecord, validateStudentTarget, validateStudentFields, STUDENT_PRIVILEGE_FIELDS,
  readDirectoryQuery, directoryPage,
  courseAliases, courseScopeAliases, normalizeCourseId, findScopedCourse,
  mentorAssignedCourse, pickWritableFields, verifyServiceSecret
};
