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

function pickFields(data, fields) {
  const record = typeof data?.toObject === 'function' ? data.toObject() : data;
  return Object.fromEntries(fields.filter(key => record && Object.hasOwn(record, key)).map(key => [key, record[key]]));
}

const publicSiteSettings = data => Object.fromEntries(
  Object.entries(pickFields(data, SITE_FIELDS)).filter(([, value]) => typeof value === 'string')
);
const mailSettingsResponse = data => pickFields(data, MAIL_FIELDS);
const accountResponse = data => pickFields(data, ACCOUNT_FIELDS);
const publicMentorProfile = data => pickFields(data, data?.showPhone === true
  ? [...PUBLIC_MENTOR_FIELDS, 'phone']
  : PUBLIC_MENTOR_FIELDS);

module.exports = {
  SITE_FIELDS,
  publicSiteSettings,
  mailSettingsResponse,
  accountResponse,
  publicMentorProfile
};
