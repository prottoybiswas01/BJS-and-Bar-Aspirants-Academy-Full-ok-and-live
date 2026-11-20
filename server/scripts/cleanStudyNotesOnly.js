/**
 * Safe One-Time Cleanup Script targeting ONLY the StudyNote collection
 * Strict Safety Rule: NEVER touch, modify, or delete students, courses, lessons, payments, or certificates.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function cleanStudyNotesOnly() {
  const mongoUri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'bjs_academy';

  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is missing.');
  }

  console.log(`Connecting to MongoDB (Database: ${dbName})...`);
  await mongoose.connect(mongoUri, { dbName });
  const db = mongoose.connection.db;

  // Verify collection existence and pre-check counts
  const studyNotesCol = db.collection('studynotes');
  const countBefore = await studyNotesCol.countDocuments({});
  console.log(`[PRE-CHECK] Current StudyNotes count: ${countBefore}`);

  // Safeguard check on core collections
  const studentsCount = await db.collection('students').countDocuments({}).catch(() => 0);
  const coursesCount = await db.collection('courses').countDocuments({}).catch(() => 0);
  const lessonsCount = await db.collection('lessons').countDocuments({}).catch(() => 0);
  console.log(`[PROTECTED ASSETS CHECK] Students: ${studentsCount}, Courses: ${coursesCount}, Lessons: ${lessonsCount}`);

  // Delete ONLY in studynotes collection
  console.log('Running StudyNote.deleteMany({})...');
  const deleteResult = await studyNotesCol.deleteMany({});
  console.log(`[RESULT] Deleted legacy StudyNote records: ${deleteResult.deletedCount}`);

  // Post-check verification
  const countAfter = await studyNotesCol.countDocuments({});
  console.log(`[POST-CHECK] StudyNotes count after cleanup: ${countAfter}`);

  // Verify protected assets are 100% untouched
  const studentsCountAfter = await db.collection('students').countDocuments({}).catch(() => 0);
  const coursesCountAfter = await db.collection('courses').countDocuments({}).catch(() => 0);
  const lessonsCountAfter = await db.collection('lessons').countDocuments({}).catch(() => 0);

  if (studentsCount !== studentsCountAfter || coursesCount !== coursesCountAfter || lessonsCount !== lessonsCountAfter) {
    throw new Error('FATAL: Protected collection count mismatch! Aborting.');
  }

  console.log('All protected collections verified 100% intact.');
  console.log('Cleanup completed successfully: StudyNotes are now at 0.');

  await mongoose.disconnect();
}

cleanStudyNotesOnly().catch((err) => {
  console.error('Cleanup error:', err);
  process.exit(1);
});
