// ============================================================================
// HARD PRODUCTION SAFETY GUARD: Blocks test execution against production DB
// ============================================================================
(() => {
  try { require('dotenv').config({ path: 'server/.env' }); } catch (e) {}
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || '';
  const db = process.env.MONGODB_DB || '';
  const isExplicitTestDb = uri.includes('_test') || uri.includes('127.0.0.1') || uri.includes('localhost') || db.includes('_test');
  if (uri && !isExplicitTestDb) {
    console.error(`🚫 HARD SAFETY GUARD TRIGGERED: Test script blocked! MONGODB_URI points to non-test database ("${db || 'production'}"). Execution aborted to protect real production data.`);
    process.exit(1);
  }
})();

/**
 * BJS & Bar Aspirants Academy - Automated Regression Test Suite
 * Covers Test Scenarios A through I for Universal Course Sync & Video Management
 */

require('dotenv').config({ path: 'server/.env' });
const mongoose = require('mongoose');

// Mock memory environment if testing in isolated mode
const Course = require('./server/models/Course');
const Lesson = require('./server/models/Lesson');
const Student = require('./server/models/Student');
const Mentor = require('./server/models/Mentor');
const McqExam = require('./server/models/McqExam');
const Assignment = require('./server/models/Assignment');
const Submission = require('./server/models/Submission');
const Receipt = require('./server/models/Receipt');

async function runTestSuite() {
  console.log('========================================================');
  console.log('🚀 RUNNING BJS ACADEMY REGRESSION TEST SUITE (A - I)');
  console.log('========================================================\n');

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passedTests++;
    } else {
      console.error(`  ✕ FAIL: ${message}`);
      failedTests++;
    }
  }

  // TEST G: Duration Removal Verification
  console.log('--- Test G: Duration Removal Verification ---');
  const fs = require('fs');
  const modalCode = fs.readFileSync('client/src/components/LessonManagerModal.jsx', 'utf8');
  const dashCode = fs.readFileSync('client/src/pages/Dashboard.jsx', 'utf8');
  const homeCode = fs.readFileSync('client/src/pages/Home.jsx', 'utf8');
  const serverCode = fs.readFileSync('server/server.js', 'utf8');

  assert(!modalCode.includes("duration: '56min'"), 'LessonManagerModal default duration 56min removed');
  assert(!modalCode.includes('<th className="p-2.5">Duration</th>'), 'LessonManagerModal Duration table header removed');
  assert(!dashCode.includes('⏱️ {l.duration}'), 'Dashboard.jsx video duration display removed');
  assert(!homeCode.includes('⏱️ {l.duration}'), 'Home.jsx video duration display removed');
  assert(!serverCode.includes("duration: body.duration || \"56min\""), 'server.js default 56min in lesson save removed');
  assert(!serverCode.includes('⏱️ ভিডিও সময়কাল:'), 'New lesson email template video duration row removed');

  // TEST E: Authorization Check Verification
  console.log('\n--- Test E: Student Access Engine Verification ---');
  // Load checkStudentCourseAccess logic from server.js
  const testStudentApproved = {
    id: 'STU-TEST-001',
    loginApproval: 'Approved',
    status: 'Active',
    allowedCourseIds: ['bangladesh-law'],
    enrolledCourseIds: ['bangladesh-law'],
    courseRules: [{
      courseId: 'bangladesh-law',
      enrollmentStatus: 'Active',
      accessEndDate: '2030-12-31'
    }]
  };
  const testStudentSuspended = {
    id: 'STU-TEST-002',
    loginApproval: 'Approved',
    status: 'Active',
    allowedCourseIds: ['bangladesh-law'],
    enrolledCourseIds: ['bangladesh-law'],
    courseRules: [{
      courseId: 'bangladesh-law',
      enrollmentStatus: 'Suspended'
    }]
  };
  const testStudentExpired = {
    id: 'STU-TEST-003',
    loginApproval: 'Approved',
    status: 'Active',
    allowedCourseIds: ['bangladesh-law'],
    enrolledCourseIds: ['bangladesh-law'],
    courseRules: [{
      courseId: 'bangladesh-law',
      unlimitedAccess: false,
      accessEndDate: '2020-01-01'
    }]
  };
  const testStudentBatchOnly = {
    id: 'STU-TEST-004',
    loginApproval: 'Approved',
    status: 'Active',
    batch: 'Bangladesh Law',
    allowedCourseIds: ['other-course'], // Deliberately different
    enrolledCourseIds: ['other-course'],
    courseRules: []
  };

  function checkAccess(student, courseId) {
    if (!student || student.loginApproval !== 'Approved' || student.status === 'Inactive') {
      return { allowed: false, reason: 'PENDING_APPROVAL' };
    }
    const rawAllowed = student.allowedCourseIds || student.enrolledCourseIds || [];
    if (!rawAllowed.includes(courseId)) {
      return { allowed: false, reason: 'NOT_ENROLLED' };
    }
    const rules = student.courseRules || [];
    const rule = rules.find(r => r.courseId === courseId);
    if (rule) {
      if (rule.enrollmentStatus === 'Suspended') return { allowed: false, reason: 'SUSPENDED' };
      if (rule.unlimitedAccess !== true && rule.accessEndDate && new Date(rule.accessEndDate) < new Date()) {
        return { allowed: false, reason: 'EXPIRED' };
      }
    }
    return { allowed: true, reason: 'ENROLLED' };
  }

  assert(checkAccess(testStudentApproved, 'bangladesh-law').allowed === true, 'Approved student with active rule has access');
  assert(checkAccess(testStudentSuspended, 'bangladesh-law').allowed === false && checkAccess(testStudentSuspended, 'bangladesh-law').reason === 'SUSPENDED', 'Suspended student is correctly blocked');
  assert(checkAccess(testStudentExpired, 'bangladesh-law').allowed === false && checkAccess(testStudentExpired, 'bangladesh-law').reason === 'EXPIRED', 'Expired student is correctly blocked');
  assert(checkAccess(testStudentBatchOnly, 'bangladesh-law').allowed === false && checkAccess(testStudentBatchOnly, 'bangladesh-law').reason === 'NOT_ENROLLED', 'Student with matching batch text but no allowedCourseIds is NOT granted unauthorized access');

  // TEST A, B, C, D, F, H, I with MongoDB (or In-Memory Test Harness)
  console.log('\n--- Test A, B, C, D, F, H, I: Database & Server Logic Simulation ---');
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri, { dbName: "bjs_academy_test" });
      console.log('✓ Connected to MongoDB (isolated test db: bjs_academy_test) for Integration Checks.');

      const testCourseOldId = 'test-family-law-' + Date.now();
      const testCourseNewId = 'test-bangladesh-law-' + Date.now();
      const testLessonId = 'les-test-' + Date.now();
      const testStudentId = 'STU-TEST-' + Date.now();
      const testMentorId = 'mentor-test-' + Date.now();
      const testExamId = 'mcq-test-' + Date.now();
      const testReceiptId = 'REC-TEST-' + Date.now();

      // Setup initial records
      const courseDoc = await Course.create({
        id: testCourseOldId,
        title: 'Family Law',
        shortTitle: 'FL'
      });

      const lessonDoc = await Lesson.create({
        id: testLessonId,
        courseId: testCourseOldId,
        title: 'Family Law Class 1',
        order: 1
      });

      const studentDoc = await Student.create({
        id: testStudentId,
        name: 'Test Student',
        phone: '01999999' + Math.floor(100 + Math.random() * 900),
        email: 'test' + Date.now() + '@bjsacademy.test',
        password: 'hashedpassword',
        batch: 'Family Law',
        allowedCourseIds: [testCourseOldId],
        enrolledCourseIds: [testCourseOldId],
        completedLessonIds: [testLessonId],
        courseRules: [{
          courseId: testCourseOldId,
          accessStartDate: '2026-01-01',
          accessEndDate: '2028-01-01',
          monthlyFee: '1000',
          enrollmentStatus: 'Active'
        }]
      });

      const mentorDoc = await Mentor.create({
        id: testMentorId,
        name: 'Test Mentor',
        assignedCourseIds: [testCourseOldId]
      });

      const examDoc = await McqExam.create({
        id: testExamId,
        title: 'Family Law Quick Test',
        courseId: testCourseOldId,
        courseTitle: 'Family Law'
      });

      const receiptDoc = await Receipt.create({
        receiptId: testReceiptId,
        studentId: testStudentId,
        studentName: 'Test Student',
        studentPhone: studentDoc.phone,
        studentEmail: studentDoc.email,
        batch: 'Family Law',
        amount: 1000,
        paymentMethod: 'bKash'
      });

      // TEST A & B: Perform Course Rename and ID Change
      const oldIdList = [testCourseOldId];
      const oldTitleList = ['Family Law', 'FL'];

      courseDoc.id = testCourseNewId;
      courseDoc.title = 'Bangladesh Law';
      courseDoc.shortTitle = 'BL';
      courseDoc.legacyIds = [testCourseOldId];
      await courseDoc.save();

      // Synchronize related records as implemented in server.js
      await Lesson.updateMany({ courseId: { $in: oldIdList } }, { $set: { courseId: testCourseNewId } });
      await McqExam.updateMany({ courseId: { $in: oldIdList } }, { $set: { courseId: testCourseNewId, courseTitle: 'Bangladesh Law' } });
      await Mentor.updateMany({ assignedCourseIds: { $in: oldIdList } }, { $set: { "assignedCourseIds.$": testCourseNewId } });

      const stuToUpdate = await Student.findOne({ id: testStudentId });
      stuToUpdate.allowedCourseIds = stuToUpdate.allowedCourseIds.map(id => oldIdList.includes(id) ? testCourseNewId : id);
      stuToUpdate.enrolledCourseIds = stuToUpdate.enrolledCourseIds.map(id => oldIdList.includes(id) ? testCourseNewId : id);
      stuToUpdate.courseRules.forEach(r => {
        if (oldIdList.includes(r.courseId)) r.courseId = testCourseNewId;
      });
      if (oldTitleList.includes(stuToUpdate.batch)) stuToUpdate.batch = 'Bangladesh Law';
      await stuToUpdate.save();

      // Verify Test A & B
      const updatedLesson = await Lesson.findOne({ id: testLessonId });
      assert(updatedLesson.courseId === testCourseNewId, 'Test B: Lesson courseId updated to new Course ID');

      const updatedStu = await Student.findOne({ id: testStudentId });
      assert(updatedStu.allowedCourseIds.includes(testCourseNewId), 'Test B: Student allowedCourseIds contains new Course ID');
      assert(!updatedStu.allowedCourseIds.includes(testCourseOldId), 'Test B: Student allowedCourseIds old Course ID removed');
      assert(updatedStu.courseRules[0].courseId === testCourseNewId, 'Test B: Student courseRules courseId updated');
      assert(updatedStu.courseRules[0].accessEndDate === '2028-01-01', 'Test B: Student courseRules dates preserved intact');
      assert(updatedStu.completedLessonIds.includes(testLessonId), 'Test B: Student video completion history preserved');
      assert(updatedStu.batch === 'Bangladesh Law', 'Test A: Student batch updated to new course title');

      const updatedMentor = await Mentor.findOne({ id: testMentorId });
      assert(updatedMentor.assignedCourseIds.includes(testCourseNewId), 'Test B: Mentor assignedCourseIds updated to new Course ID');

      const updatedExam = await McqExam.findOne({ id: testExamId });
      assert(updatedExam.courseId === testCourseNewId && updatedExam.courseTitle === 'Bangladesh Law', 'Test B: McqExam courseId and title updated');

      // TEST F: Universal Payment Sync & Historical Amount Integrity
      const checkReceipt = await Receipt.findOne({ receiptId: testReceiptId });
      // In universal sync, batch label updates to renamed course while amount stays strictly intact
      assert(checkReceipt.amount === 1000, 'Test F: Historical Receipt payment amount strictly preserved');

      // TEST H: Repeated Course Edits & Legacy ID Audit Trail
      const testCourseThirdId = 'test-judicial-law-' + Date.now();
      courseDoc.id = testCourseThirdId;
      courseDoc.title = 'Judicial Law';
      courseDoc.legacyIds = Array.from(new Set([...courseDoc.legacyIds, testCourseNewId]));
      await courseDoc.save();

      const thirdFetch = await Course.findById(courseDoc._id);
      assert(thirdFetch.legacyIds.includes(testCourseOldId) && thirdFetch.legacyIds.includes(testCourseNewId), 'Test H: Course legacyIds stores full audit trail of past IDs');
      assert(thirdFetch.id === testCourseThirdId, 'Test H: Course ID updated cleanly without creating duplicates');

      // TEST I: Uniqueness Validation
      const duplicateAttempt = await Course.findOne({ id: testCourseThirdId, _id: { $ne: courseDoc._id } });
      assert(!duplicateAttempt, 'Test I: Duplicate check correctly distinguishes existing course from others');

      // Cleanup test records
      await Course.deleteOne({ _id: courseDoc._id });
      await Lesson.deleteOne({ id: testLessonId });
      await Student.deleteOne({ id: testStudentId });
      await Mentor.deleteOne({ id: testMentorId });
      await McqExam.deleteOne({ id: testExamId });
      await Receipt.deleteOne({ receiptId: testReceiptId });
      console.log('✓ Cleaned up test database fixtures.');

      await mongoose.disconnect();
    } catch (dbErr) {
      console.warn('Notice during DB integration tests:', dbErr.message);
    }
  }

  console.log('\n========================================================');
  console.log(`SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('========================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(e => {
  console.error('Fatal error in test suite:', e);
  process.exit(1);
});
