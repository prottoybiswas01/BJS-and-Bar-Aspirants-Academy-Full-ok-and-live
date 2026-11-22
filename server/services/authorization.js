const { createHash, timingSafeEqual } = require('node:crypto');
const { AuthError } = require('./authSecurity');

const IDENTITY_FIELDS = ['id', 'regId', '_id'];

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

function mentorAssignedCourse(mentor, courseId, course) {
  if (mentor?.role !== 'mentor' || mentor.loginApproval !== 'Approved' || mentor.status !== 'Active') return false;
  const candidates = [courseId, ...courseAliases(course)]
    .map(normalizeCourseId).filter(Boolean);
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
  accountIds, isAccountId, ownsStudentRecord, courseAliases, normalizeCourseId, findScopedCourse,
  mentorAssignedCourse, pickWritableFields, verifyServiceSecret
};
