const SITE_FIELDS = ['badgeText', 'heroTitle', 'heroSubtitle'];
const MAIL_FIELDS = [
  'enabled', 'fallbackEmail', 'replyToEmail', 'enableAllMails', 'sendAdminCopy', 'loginMails',
  'profileUpdateMails', 'courseAccessMails', 'deviceUpdateMails', 'paymentReviewMails'
];
const ACCOUNT_FIELDS = [
  '_id', 'id', 'regId', 'name', 'email', 'phone', 'photoUrl', 'university', 'batch', 'session', 'course',
  'joinedOn', 'createdAt', 'updatedAt', 'status', 'loginApproval', 'portalAccessMode', 'isTemporaryPassword',
  'enrolledCourseIds', 'allowedCourseIds', 'enrolledCourses', 'completedLessonIds', 'courseRules',
  'unlimitedAccess', 'accessVersion', 'maxDeviceCount', 'devices', 'popupMessage', 'highlight',
  'assignedCourseIds', 'designation', 'posting', 'expertise', 'showPhone', 'bio', 'studentsMentored',
  'judgesProduced', 'experienceYears', 'ratingScore'
];
const PUBLIC_MENTOR_FIELDS = [
  '_id', 'id', 'name', 'photoUrl', 'designation', 'posting', 'expertise', 'showPhone', 'status', 'bio',
  'studentsMentored', 'judgesProduced', 'experienceYears', 'ratingScore'
];
const COURSE_RULE_FIELDS = [
  'courseId', 'unlimitedAccess', 'accessStartDate', 'accessEndDate', 'videoAccessUntil',
  'lastPaymentDate', 'paymentDueDate', 'monthlyFee', 'enrollmentStatus', 'paidMonths'
];
const ADMIN_STUDENT_FIELDS = [...ACCOUNT_FIELDS.filter(field => field !== 'devices'),
  'adminNote', 'reviewNote', 'emailStatus', 'bouncedAt', 'bouncedReason', 'googleContactPhone',
  'registrationStatus', 'registrationDate', 'registrationTime', 'joinedDate', 'source', 'isRegistrationOnly'
];
const REGISTRATION_FIELDS = [
  '_id', 'regId', 'name', 'phone', 'email', 'university', 'batch', 'session', 'status', 'reviewNote', 'adminNote',
  'createdAt', 'updatedAt'
];
const RECEIPT_FIELDS = [
  'receiptId', 'studentId', 'studentName', 'batch', 'amount', 'paymentMethod', 'trxId', 'paymentTime', 'createdAt', 'issuedBy'
];
const CERTIFICATE_FIELDS = ['certificateId', 'studentName', 'courseTitle', 'issueDate', 'issuedBy', 'status'];
const RESULT_FIELDS = [
  '_id', 'id', 'examId', 'examTitle', 'score', 'totalMarks', 'percentage', 'correctCount', 'wrongCount',
  'unansweredCount', 'negativeDeduction', 'netScore', 'timeTakenSeconds', 'rank', 'grade', 'submittedAt'
];
const SUBMISSION_FIELDS = [
  'id', 'assignmentId', 'studentId', 'studentName', 'courseId', 'submissionText', 'attachmentUrl', 'imageUrls',
  'marksObtained', 'feedback', 'gradedAt', 'gradedBy', 'canResubmit', 'createdAt'
];

function projectNestedAccount(profile) {
  if (Array.isArray(profile.courseRules)) profile.courseRules = profile.courseRules.map(rule => pickFields(rule, COURSE_RULE_FIELDS));
  if (profile.popupMessage) profile.popupMessage = pickFields(profile.popupMessage, ['title', 'body', 'sentAt']);
  if (Array.isArray(profile.enrolledCourses)) {
    profile.enrolledCourses = profile.enrolledCourses.map(course => typeof course === 'string'
      ? course
      : pickFields(course, ['id', 'courseId', 'title', 'shortTitle', 'isEnrolled', 'isAccessible', 'lockReason']));
  }
  return profile;
}

function pickFields(data, fields) {
  const record = typeof data?.toObject === 'function' ? data.toObject() : data;
  return Object.fromEntries(fields.filter(key => record && Object.hasOwn(record, key)).map(key => [key, record[key]]));
}

const publicSiteSettings = data => Object.fromEntries(
  Object.entries(pickFields(data, SITE_FIELDS)).filter(([, value]) => typeof value === 'string')
);
const mailSettingsResponse = data => pickFields(data, MAIL_FIELDS);
function accountResponse(data) {
  const profile = pickFields(data, ACCOUNT_FIELDS);
  if (typeof profile.phone === 'string' && /^GOOGLE-[a-p]{32}$/.test(profile.phone)) profile.phone = '';
  return profile;
}
function privateAccountProfile(data) {
  const profile = projectNestedAccount(accountResponse(data));
  delete profile._id;
  if (Array.isArray(profile.devices)) {
    profile.devices = profile.devices.map(device => pickFields(device, ['platform', 'browser', 'lastLogin']));
  }
  return profile;
}

function adminStudentResponse(data) {
  const profile = projectNestedAccount(pickFields(data, ADMIN_STUDENT_FIELDS));
  if (Array.isArray(data?.devices)) profile.devices = data.devices.map(device => pickFields(device, ['deviceId', 'platform', 'browser', 'lastLogin']));
  return profile;
}

const adminRegistrationResponse = data => pickFields(data, REGISTRATION_FIELDS);
const mentorStudentResponse = data => pickFields(data, [
  'id', 'name', 'phone', 'email', 'batch', 'session', 'status', 'loginApproval', 'allowedCourseIds'
]);
const studentReceiptResponse = data => pickFields(data, RECEIPT_FIELDS);
const publicCertificateResponse = data => pickFields(data, CERTIFICATE_FIELDS);
const studentCertificateResponse = data => pickFields(data, [...CERTIFICATE_FIELDS, 'studentId', 'courseId', 'completionScore']);
const studentResultResponse = data => pickFields(data, RESULT_FIELDS);
const classroomSubmissionResponse = data => pickFields(data, SUBMISSION_FIELDS);
const publicMentorProfile = data => pickFields(data, data?.showPhone === true
  ? [...PUBLIC_MENTOR_FIELDS, 'phone']
  : PUBLIC_MENTOR_FIELDS);

module.exports = {
  SITE_FIELDS,
  publicSiteSettings,
  mailSettingsResponse,
  accountResponse,
  privateAccountProfile,
  adminStudentResponse,
  adminRegistrationResponse,
  mentorStudentResponse,
  studentReceiptResponse,
  publicCertificateResponse,
  studentCertificateResponse,
  studentResultResponse,
  classroomSubmissionResponse,
  publicMentorProfile
};
