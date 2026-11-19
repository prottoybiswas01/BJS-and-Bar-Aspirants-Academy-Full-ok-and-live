/**
 * BJS & Bar Aspirants Academy - Production Data Recovery & Fail-Safe Test Suite
 * Validates:
 * 1. Safe connection & truthful database reporting (Finding B)
 * 2. Fail-safe HTTP 503 instead of silent empty HTTP 200 (Finding A)
 * 3. Query errors are not silently swallowed by .catch(() => []) (Finding C)
 * 4. Automatic writes and sweeps are safely guarded (Finding D)
 * 5. Production database bjs_academy is read-only verified intact
 */

require('dotenv').config({ path: 'server/.env' });
const mongoose = require('mongoose');

async function runRecoveryVerification() {
  console.log('========================================================');
  console.log('🛡️ RUNNING PRODUCTION DATA RECOVERY & FAIL-SAFE VERIFICATION');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message, detail = '') {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✕ FAIL: ${message} ${detail ? '(' + detail + ')' : ''}`);
      failed++;
    }
  }

  // 1. SOURCE CODE AUDIT: Check that dangerous automatic writes are disabled
  console.log('--- 1. Guarded Automatic Writes & Sweeps (Finding D) ---');
  const fs = require('fs');
  const serverCode = fs.readFileSync('server/server.js', 'utf8');

  assert(
    !serverCode.includes('setInterval(autoCleanExpiredScriptImages'),
    'autoCleanExpiredScriptImages 6-hour interval is removed'
  );
  assert(
    serverCode.includes("if (process.env.ENABLE_AUTO_IMAGE_CLEANUP !== 'true') return;"),
    'autoCleanExpiredScriptImages is strictly guarded behind ENABLE_AUTO_IMAGE_CLEANUP'
  );
  assert(
    !serverCode.includes('runStudentConsistencySweep().catch'),
    'runStudentConsistencySweep cold-start execution is removed from ensureDbConnected'
  );
  assert(
    serverCode.includes("if (process.env.ENABLE_STUDENT_SWEEP !== 'true') return;"),
    'runStudentConsistencySweep is strictly guarded behind ENABLE_STUDENT_SWEEP'
  );

  // 2. HEALTH CHECK TRUTHFULNESS: Verify /api/health returns 503 when disconnected
  console.log('\n--- 2. Truthful Health & Disconnect Handling (Finding A) ---');
  assert(
    serverCode.includes('const statusCode = isMongoConnected ? 200 : 503;'),
    '/api/health uses 503 status code when MongoDB is disconnected'
  );
  assert(
    serverCode.includes('dbMode: isMongoConnected ? "MongoDB Atlas Connected" : "Disconnected"'),
    '/api/health no longer reports deceptive "Fallback High-Speed Engine Active"'
  );
  assert(
    serverCode.includes('database: currentDbName'),
    '/api/health truthfully reports mongoose.connection.name'
  );

  // 3. SILENT QUERY FAILURE AUDIT (Finding C)
  console.log('\n--- 3. Error Propagation in syncMemoryDbFromMongo (Finding C) ---');
  assert(
    !serverCode.includes('Student.find().lean().catch(() => [])'),
    'syncMemoryDbFromMongo no longer uses silent .catch(() => []) for Student'
  );
  assert(
    !serverCode.includes('Course.find().lean().catch(() => [])'),
    'syncMemoryDbFromMongo no longer uses silent .catch(() => []) for Course'
  );

  // 4. FAIL-SAFE HTTP 503 ON DISCONNECTED DATA ENDPOINTS
  console.log('\n--- 4. Fail-Safe 503 on Data Endpoints When Disconnected ---');
  assert(
    serverCode.includes('DATABASE_UNAVAILABLE'),
    'Endpoints define safe DATABASE_UNAVAILABLE error responses'
  );

  // 5. READ-ONLY ATLAS PRODUCTION DATABASE VERIFICATION (Finding B)
  console.log('\n--- 5. MongoDB Atlas Production Records Verification (Read-Only) ---');
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.warn('⚠️ MONGODB_URI not found in server/.env; skipping live DB read test');
  } else {
    try {
      await mongoose.connect(mongoUri, { dbName: process.env.MONGODB_DB || 'bjs_academy' });
      assert(mongoose.connection.name === 'bjs_academy', 'Connected database is verified as bjs_academy', mongoose.connection.name);

      const Course = require('./server/models/Course');
      const Lesson = require('./server/models/Lesson');
      const Student = require('./server/models/Student');
      const Mentor = require('./server/models/Mentor');
      const Receipt = require('./server/models/Receipt');

      const [courseCount, lessonCount, studentCount, mentorCount, receiptCount] = await Promise.all([
        Course.countDocuments(),
        Lesson.countDocuments(),
        Student.countDocuments(),
        Mentor.countDocuments(),
        Receipt.countDocuments()
      ]);

      console.log(`    Live Production Record Counts:`);
      console.log(`    - Courses: ${courseCount}`);
      console.log(`    - Lessons: ${lessonCount}`);
      console.log(`    - Students: ${studentCount}`);
      console.log(`    - Mentors: ${mentorCount}`);
      console.log(`    - Receipts: ${receiptCount}`);

      assert(courseCount >= 6, `Verified existing courses intact (${courseCount} >= 6)`);
      assert(lessonCount >= 90, `Verified existing lessons intact (${lessonCount} >= 90)`);
      assert(studentCount >= 13, `Verified existing students intact (${studentCount} >= 13)`);
      assert(mentorCount >= 3, `Verified existing mentors intact (${mentorCount} >= 3)`);
      assert(receiptCount >= 24, `Verified existing receipts intact (${receiptCount} >= 24)`);

      await mongoose.disconnect();
    } catch (dbErr) {
      assert(false, 'Atlas read-only query failed: ' + dbErr.message);
    }
  }

  console.log('\n========================================================');
  console.log(`RECOVERY SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================');

  if (failed > 0) process.exit(1);
}

runRecoveryVerification().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
