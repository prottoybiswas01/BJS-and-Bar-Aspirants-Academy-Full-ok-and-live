const { AuthError } = require('./authSecurity');
const { fingerprint } = require('./firebaseIdentity');

const exactEmail = email => new RegExp('^' + email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i');

function createGoogleAccountStore({ mongoose, Student, Mentor, Registration, Receipt, Course, isConnected }) {
  function collection() {
    if (!isConnected()) throw new AuthError('AUTH_UNAVAILABLE');
    return mongoose.connection.db.collection('firebase_account_links');
  }

  async function findExisting(email, session = null) {
    const filter = { email: exactEmail(email) };
    const students = await Student.find(filter).select('-password').limit(2).session(session).lean();
    const mentors = await Mentor.find(filter).select('-password').limit(2).session(session).lean();
    if (students.length + mentors.length > 1) throw new AuthError('GOOGLE_CONFLICT');
    if (students.length) return { kind: 'student', account: students[0] };
    if (mentors.length) return { kind: 'mentor', account: mentors[0] };
    if (await Registration.exists(filter).session(session) ||
        await Receipt.exists({ studentEmail: filter.email }).session(session)) throw new AuthError('GOOGLE_CONFLICT');
    return null;
  }

  async function loadAccount(kind, recordId, session = null) {
    const Model = kind === 'student' ? Student : kind === 'mentor' ? Mentor : null;
    if (!Model || !mongoose.isObjectIdOrHexString(recordId)) throw new AuthError('GOOGLE_CONFLICT');
    return Model.findById(recordId).select('-password').session(session).lean();
  }

  async function storeBinding({ uidKey, providerKey, kind, account, approvedBy, reservations = [] }, session) {
    const recordId = String(account._id);
    const linkedAt = new Date();
    // Built-in unique _id indexes cover the Firebase UID, Google subject and academy account.
    await collection().insertMany([
      { _id: 'uid:' + uidKey, providerKey, kind, recordId, accountId: account.id, linkedAt, approvedBy },
      { _id: 'provider:' + providerKey, uidKey, linkedAt },
      { _id: 'account:' + kind + ':' + recordId, uidKey, linkedAt },
      ...reservations.map(key => ({ _id: key, uidKey, linkedAt }))
    ], { session });
  }

  async function findLink(identity) {
    const links = collection();
    const binding = await links.findOne({ _id: 'uid:' + identity.uidKey });
    if (binding) {
      if (binding.providerKey !== identity.providerKey) throw new AuthError('GOOGLE_CONFLICT');
      return binding;
    }
    if (await links.findOne({ _id: 'provider:' + identity.providerKey })) throw new AuthError('GOOGLE_CONFLICT');
    return null;
  }

  async function approveLink(request, approver, assertEligible) {
    collection();
    return mongoose.connection.transaction(async session => {
      const account = await loadAccount(request.kind, request.recordId, session);
      assertEligible(request.kind, account);
      const email = account.email?.trim().toLowerCase();
      if (account.id !== request.accountId || fingerprint(email) !== request.emailKey) {
        throw new AuthError('GOOGLE_LINK_INVALID');
      }
      const candidate = await findExisting(email, session);
      if (candidate?.kind !== request.kind || String(candidate.account._id) !== request.recordId) {
        throw new AuthError('GOOGLE_CONFLICT');
      }
      const stored = await collection().findOne({ _id: 'uid:' + request.uidKey }, { session });
      if (stored?.providerKey === request.providerKey && stored.kind === request.kind &&
          stored.recordId === request.recordId) return;
      await storeBinding({ ...request, account, approvedBy: approver }, session);
    });
  }

  async function registerStudent(identity, details) {
    collection();
    return mongoose.connection.transaction(async session => {
      if (await findExisting(identity.email, session)) throw new AuthError('GOOGLE_CONFLICT');

      const { courseId, ...data } = details;
      const course = await Course.findOne({
        $or: [{ id: courseId }, ...(mongoose.isObjectIdOrHexString(courseId) ? [{ _id: courseId }] : [])],
        status: { $nin: ['Inactive', 'Hidden'] }
      }).session(session).lean();
      if (!course) throw new AuthError('GOOGLE_PROFILE_INVALID');

      const [student] = await Student.create([{
        ...data,
        batch: course.title || course.shortTitle || course.id,
        session: course.sessionRegText || course.schedule || 'Weekend Intensive'
      }], { session });
      await storeBinding({
        ...identity, kind: 'student', account: student,
        reservations: ['signup-email:' + fingerprint(identity.email)]
      }, session);
      return student;
    });
  }

  return { findExisting, findLink, loadAccount, approveLink, registerStudent };
}

module.exports = { createGoogleAccountStore };
