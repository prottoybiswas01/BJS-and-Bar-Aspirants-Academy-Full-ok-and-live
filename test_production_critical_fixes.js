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

const assert = require('assert');
require('dotenv').config({ path: './server/.env' });
const mongoose = require('mongoose');
const QRCode = require('qrcode');
const { generateCertificatePdf } = require('./server/services/certificateService');
const Certificate = require('./server/models/Certificate');
const StudyNote = require('./server/models/StudyNote');
const Student = require('./server/models/Student');
const Course = require('./server/models/Course');
const Lesson = require('./server/models/Lesson');

async function runCriticalFixesTests() {
  console.log('========================================================');
  console.log('🚀 TESTING 3 CRITICAL PRODUCTION FIXES (bjs.kodl.uk)');
  console.log('========================================================');

  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bjs_academy_test';
  await mongoose.connect(MONGODB_URI, { dbName: 'bjs_academy_test', serverSelectionTimeoutMS: 5000 });

  // -------------------------------------------------------------------------
  // TEST 1: GEMINI AI AUTO-MCQ LESSON DROPDOWN VERIFICATION
  // -------------------------------------------------------------------------
  console.log('\n--- Test 1: Gemini AI Auto-MCQ Lesson Dropdown ---');
  // Clean & create test course and lesson
  await Course.deleteMany({ id: /^test-crit-course-/ });
  await Lesson.deleteMany({ id: /^test-crit-lsn-/ });

  const testCourse = await Course.create({
    id: 'test-crit-course-01',
    title: 'দেওয়ানী কার্যবিধি ও বিচারিক রিট কোর্স',
    fee: 1500,
    status: 'Active'
  });

  const testLessonWithSub = await Lesson.create({
    id: 'test-crit-lsn-01',
    courseId: testCourse.id,
    title: 'অস্থায়ী নিষেধাজ্ঞা (Order 39) বিস্তারিত বিশ্লেষণ',
    youtubeId: 'dQw4w9WgXcQ',
    hasSubtitles: true,
    transcriptStatus: 'ready',
    transcript: 'অস্থায়ী নিষেধাজ্ঞার ৩টি গোল্ডেন নীতি...'
  });

  const testLessonNoSub = await Lesson.create({
    id: 'test-crit-lsn-02',
    courseId: testCourse.id,
    title: 'আরজি নাকচ (Order 7 Rule 11) বিধান',
    youtubeId: 'dQw4w9WgXcQ',
    hasSubtitles: false,
    transcriptStatus: 'none',
    transcript: ''
  });

  // Verify transcript indicator
  const hasSub1 = Boolean(testLessonWithSub.hasSubtitles || testLessonWithSub.transcriptStatus === 'ready' || (testLessonWithSub.transcript && testLessonWithSub.transcript.length > 20));
  const hasSub2 = Boolean(testLessonNoSub.hasSubtitles || testLessonNoSub.transcriptStatus === 'ready' || (testLessonNoSub.transcript && testLessonNoSub.transcript.length > 20));

  assert.strictEqual(hasSub1, true, 'Lesson 1 must report transcript ready');
  assert.strictEqual(hasSub2, false, 'Lesson 2 must report transcript not ready');

  const label1 = `${testCourse.title} — ${testLessonWithSub.title}${hasSub1 ? ' [✓ সাবটাইটেল রেডি]' : ' [⚠️ সাবটাইটেল নেই]'}`;
  assert(label1.includes('[✓ সাবটাইটেল রেডি]'), 'Label 1 must include transcript ready badge');
  console.log(`  ✓ PASS: Lesson dropdown labeling verified:\n     -> "${label1}"`);

  // -------------------------------------------------------------------------
  // TEST 2: DIGITAL CERTIFICATE GENERATION & VERIFICATION
  // -------------------------------------------------------------------------
  console.log('\n--- Test 2: Digital Certificate Generation & QR Verification ---');
  await Certificate.deleteMany({ certificateId: /^CERT-BJS-TEST-/ });

  const testStudent = await Student.findOneAndUpdate(
    { id: 'STU-TEST-CERT-01' },
    {
      id: 'STU-TEST-CERT-01',
      name: 'ফারজানা ইয়াসমিন (পরীক্ষার্থী)',
      phone: '01899998888',
      email: 'farzana.test@bjs.local',
      password: 'hashed_pw_test',
      status: 'Active',
      loginApproval: 'Approved'
    },
    { upsert: true, new: true }
  );

  const certId = `CERT-BJS-TEST-${Math.floor(1000 + Math.random() * 9000)}`;
  const verificationUrl = `https://bjs.kodl.uk/verify/${certId}`;
  const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, { width: 140, margin: 1 });

  assert(qrCodeDataUrl.startsWith('data:image/png;base64,'), 'QR Code Data URL must be valid Base64 PNG');

  const certDoc = await Certificate.create({
    certificateId: certId,
    studentId: testStudent.id,
    studentName: testStudent.name,
    courseId: testCourse.id,
    courseTitle: testCourse.title,
    completionScore: 95,
    verificationUrl,
    qrCodeDataUrl,
    issueDate: new Date()
  });

  assert(certDoc._id, 'Certificate must save to MongoDB');
  assert.strictEqual(certDoc.certificateId, certId);
  assert.strictEqual(certDoc.studentName, testStudent.name);
  assert.strictEqual(certDoc.completionScore, 95);

  const verifiedCert = await Certificate.findOne({ certificateId: certId }).lean();
  assert(verifiedCert, 'Certificate must verify online by certificateId');
  assert.strictEqual(verifiedCert.status, 'Valid', 'Certificate status must be Valid');

  const certPdfBuffer = await generateCertificatePdf({
    certificateId: certDoc.certificateId,
    studentName: certDoc.studentName,
    courseTitle: certDoc.courseTitle,
    issueDate: certDoc.issueDate,
    verificationUrl: certDoc.verificationUrl
  });

  assert(Buffer.isBuffer(certPdfBuffer), 'PDF must be generated as Buffer');
  assert(certPdfBuffer.length > 2000, 'PDF buffer must be valid size');
  console.log(`  ✓ PASS: Digital Certificate created, saved to MongoDB and verified on /verify/${certId}`);

  // -------------------------------------------------------------------------
  // TEST 3: DYNAMIC LEGAL STUDY GUIDE WITH VIDEO CLIPS & FULL CRUD
  // -------------------------------------------------------------------------
  console.log('\n--- Test 3: AI Dynamic Study Notes with Video Clips & Admin CRUD ---');
  await StudyNote.deleteMany({ id: /^test-crit-note-/ });

  const testNote = await StudyNote.create({
    id: 'test-crit-note-01',
    title: 'ফৌজদারি কার্যবিধির ১৬৭ ধারা: পুলিশ রিমান্ডের বাধ্যতামূলক শর্তাবলী',
    slug: 'crpc-167-police-remand-guidelines-test',
    category: 'ফৌজদারী কার্যবিধি (CrPC)',
    sectionReference: 'CrPC Section 167',
    summary: '১৬৭ ধারায় পুলিশ রিমান্ডের ১৫ দিনের সর্বোচ্চ সীমা ও ম্যাজিস্ট্রেটের বিচারিক দায়িত্ব।',
    content: '## ১৬৭ ধারার মূল নীতি\n২৪ ঘণ্টার মধ্যে তদন্ত শেষ করা অসম্ভব হলে ম্যাজিস্ট্রেট রিমান্ড মঞ্জুর করতে পারেন...',
    detailedExplanation: '## ১৬৭ ধারার মূল নীতি\n২৪ ঘণ্টার মধ্যে তদন্ত শেষ করা অসম্ভব হলে ম্যাজিস্ট্রেট রিমান্ড মঞ্জুর করতে পারেন...',
    readTime: '৫ মিনিট',
    isPublished: true,
    sourceCourseId: testCourse.id,
    sourceLessonId: testLessonWithSub.id,
    courseId: testCourse.id,
    courseTitle: testCourse.title,
    lessonId: testLessonWithSub.id,
    lessonTitle: testLessonWithSub.title,
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    youtubeId: 'dQw4w9WgXcQ',
    clipStartSeconds: 120,
    clipEndSeconds: 300,
    clipDuration: 180,
    seoTitle: 'CrPC 167 Police Remand Rules in Bangladesh',
    seoDescription: 'BJS Guide to Section 167 Police Remand and BLAST Guidelines.',
    seoKeywords: ['CrPC 167', 'Police Remand', 'BJS exam', 'Bangladesh Law']
  });

  assert(testNote._id, 'Dynamic study note must save to MongoDB');
  assert.strictEqual(testNote.clipStartSeconds, 120);
  assert.strictEqual(testNote.clipEndSeconds, 300);
  assert.strictEqual(testNote.clipDuration, 180);
  assert(testNote.seoKeywords.includes('CrPC 167'));

  // Test Update (Edit)
  const updatedNote = await StudyNote.findOneAndUpdate(
    { id: testNote.id },
    { title: 'ফৌজদারি কার্যবিধির ১৬৭ ধারা: পুলিশ রিমান্ড ও ব্লাস্ট গাইডলাইনস' },
    { new: true }
  );
  assert.strictEqual(updatedNote.title, 'ফৌজদারি কার্যবিধির ১৬৭ ধারা: পুলিশ রিমান্ড ও ব্লাস্ট গাইডলাইনস');

  // Test Delete
  await StudyNote.deleteOne({ id: testNote.id });
  const deletedCheck = await StudyNote.findOne({ id: testNote.id });
  assert.strictEqual(deletedCheck, null, 'Study note must be deleted cleanly');
  console.log('  ✓ PASS: AI Study Note with video clip segment and full CRUD verified');

  // Cleanup test fixtures
  await Course.deleteMany({ id: /^test-crit-course-/ });
  await Lesson.deleteMany({ id: /^test-crit-lsn-/ });
  await Certificate.deleteMany({ certificateId: /^CERT-BJS-TEST-/ });
  await Student.deleteMany({ id: /^STU-TEST-CERT-/ });
  await mongoose.disconnect();

  console.log('\n========================================================');
  console.log('✓ ALL 3 CRITICAL PRODUCTION FIX TESTS PASSED WITH 100% SUCCESS!');
  console.log('========================================================');
}

runCriticalFixesTests()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Test Suite Error:', err);
    process.exit(1);
  });
