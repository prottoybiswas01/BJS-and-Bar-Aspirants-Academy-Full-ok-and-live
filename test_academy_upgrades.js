const assert = require('assert');
require('dotenv').config({ path: './server/.env' });
const mongoose = require('mongoose');
const { generateCertificatePdf } = require('./server/services/certificateService');
const { getExamLeaderboard, seedDefaultStudyNotes } = require('./server/services/academyFeaturesService');
const Certificate = require('./server/models/Certificate');
const StudyNote = require('./server/models/StudyNote');
const PushSubscription = require('./server/models/PushSubscription');
const McqExam = require('./server/models/McqExam');
const McqResult = require('./server/models/McqResult');

async function runUpgradesTestSuite() {
  console.log('========================================================');
  console.log('🚀 TESTING PREMIUM DIGITAL LAW ACADEMY NEW FEATURES');
  console.log('========================================================');

  // Test 1: Certificate PDF Generation with QR Code
  console.log('\n--- Test 1: Certificate PDF & QR Generation ---');
  const sampleCert = {
    certificateId: 'BJS-TEST-2026-999',
    studentName: 'Advocate Farhana Yasmin',
    studentId: 'STU-2026-007',
    courseTitle: 'Judicial Foundation & 18th BJS Mastery Course',
    issueDate: new Date(),
    verificationUrl: 'https://bjs.kodl.uk/verify/BJS-TEST-2026-999'
  };

  const pdfBuffer = await generateCertificatePdf(sampleCert);
  assert(Buffer.isBuffer(pdfBuffer), 'PDF result must be a Buffer');
  assert(pdfBuffer.length > 2000, `PDF size should be substantial (got ${pdfBuffer.length} bytes)`);
  console.log(`  ✓ PASS: Certificate PDF generated successfully (${(pdfBuffer.length / 1024).toFixed(2)} KB)`);

  // Test 2: Leaderboard Engine & Negative Marks Scoring Calculation
  console.log('\n--- Test 2: Central Merit List & Leaderboard Calculation ---');
  // Connect to isolated in-memory or test db
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bjs_academy_test';
  await mongoose.connect(MONGODB_URI, { dbName: 'bjs_academy_test' });

  // Clean test fixtures
  await McqExam.deleteMany({ $or: [{ id: /^exam-upgrade-/ }, { title: /^TEST_UPGRADE_/ }] });
  await McqResult.deleteMany({ $or: [{ id: /^res-upgrade-/ }, { studentName: /^TEST_STUDENT_/ }] });

  const testExam = await McqExam.create({
    id: 'exam-upgrade-test-01',
    title: 'TEST_UPGRADE_Central_Model_Test',
    subject: 'দেওয়ানী কার্যবিধি ও তামাদি আইন',
    isLiveModelTest: true,
    totalQuestions: 10,
    totalMarks: 10,
    passMarks: 5,
    negativeMarks: 0.25,
    durationMinutes: 15,
    questions: Array.from({ length: 10 }, (_, i) => ({
      id: `q-${i + 1}`,
      serial: i + 1,
      questionText: `Test Q${i + 1}`,
      options: ['ক', 'খ', 'গ', 'ঘ'],
      correctIndex: 0
    }))
  });

  // Participant 1: 9 correct, 1 wrong -> 9 - (1 * 0.25) = 8.75
  await McqResult.create({
    id: 'res-upgrade-alpha',
    examId: testExam._id.toString(),
    candidateName: 'TEST_STUDENT_ALPHA',
    studentName: 'TEST_STUDENT_ALPHA',
    studentPhone: '01811112222',
    score: 8.75,
    totalMarks: 10,
    correctCount: 9,
    wrongCount: 1,
    negativeDeduction: 0.25,
    netScore: 8.75,
    timeTakenSeconds: 320,
    percentage: 87.5
  });

  // Participant 2: 7 correct, 2 wrong -> 7 - 0.5 = 6.50
  await McqResult.create({
    id: 'res-upgrade-beta',
    examId: testExam._id.toString(),
    candidateName: 'TEST_STUDENT_BETA',
    studentName: 'TEST_STUDENT_BETA',
    studentPhone: '01733334444',
    score: 6.50,
    totalMarks: 10,
    correctCount: 7,
    wrongCount: 2,
    negativeDeduction: 0.50,
    netScore: 6.50,
    timeTakenSeconds: 450,
    percentage: 65.0
  });

  const boardData = await getExamLeaderboard(testExam._id.toString());
  assert.strictEqual(boardData.totalParticipants, 2, 'Must have 2 examinees');
  assert.strictEqual(boardData.leaderboard[0].studentName, 'TEST_STUDENT_ALPHA', 'Top rank must be Alpha');
  assert.strictEqual(boardData.leaderboard[0].rank, 1, 'Alpha must be rank 1');
  assert.strictEqual(boardData.leaderboard[0].netScore, 8.75, 'Alpha net score must be 8.75');
  assert.strictEqual(boardData.leaderboard[1].rank, 2, 'Beta must be rank 2');
  console.log('  ✓ PASS: Leaderboard ranked examinees with correct net scores and negative marking deductions');

  // Test 3: Dynamic AI Legal Study Notes & Video Clips Schema
  console.log('\n--- Test 3: Dynamic Law Study Notes & Video Clip Schema ---');
  assert(StudyNote.schema.path('clipStartSeconds'), 'StudyNote must have clipStartSeconds');
  assert(StudyNote.schema.path('clipEndSeconds'), 'StudyNote must have clipEndSeconds');
  assert(StudyNote.schema.path('seoTitle'), 'StudyNote must have seoTitle');
  assert(StudyNote.schema.path('seoKeywords'), 'StudyNote must have seoKeywords');
  console.log('  ✓ PASS: Dynamic Law Study Note schema verified with video clips & SEO metadata');

  // Test 4: Models Schema Verification
  console.log('\n--- Test 4: PushSubscription & Certificate Schemas ---');
  assert(Certificate.schema.path('certificateId'), 'Certificate must have certificateId');
  assert(Certificate.schema.path('qrCodeDataUrl'), 'Certificate must have qrCodeDataUrl');
  assert(PushSubscription.schema.path('endpoint'), 'PushSubscription must have endpoint');
  console.log('  ✓ PASS: Models schema verified with all required fields');

  // Clean up test fixtures
  await McqExam.deleteMany({ title: /^TEST_UPGRADE_/ });
  await McqResult.deleteMany({ studentName: /^TEST_STUDENT_/ });
  await mongoose.disconnect();

  console.log('\n========================================================');
  console.log('✓ ALL PREMIUM DIGITAL LAW ACADEMY FEATURE TESTS PASSED!');
  console.log('========================================================');
}

runUpgradesTestSuite().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Test Suite Failure:', err);
  process.exit(1);
});
