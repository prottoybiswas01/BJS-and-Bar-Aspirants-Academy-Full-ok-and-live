const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });
const mongoose = require('mongoose');
const { backfillAllExistingSubtitles } = require('../server/services/subtitleScheduler');
const Lesson = require('../server/models/Lesson');

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'bjs_academy' });
  console.log('Connected to MongoDB database: bjs_academy');

  const beforeTotal = await Lesson.countDocuments();
  const beforeHasSub = await Lesson.countDocuments({ hasSubtitles: true });
  const beforeWithTrans = await Lesson.countDocuments({ transcript: { $exists: true, $type: 'string', $regex: /^.{25,}$/ } });
  
  console.log(`\n=== BEFORE BACKFILL ===`);
  console.log(`Total Lessons in MongoDB: ${beforeTotal}`);
  console.log(`Lessons with hasSubtitles: true: ${beforeHasSub}`);
  console.log(`Lessons with valid transcript text: ${beforeWithTrans}`);

  console.log(`\nRunning backfillAllExistingSubtitles...`);
  const result = await backfillAllExistingSubtitles({ LessonModel: Lesson, maxPerBatch: 10, maxTotal: 150 });
  console.log(`Backfill result:`, result);

  const afterTotal = await Lesson.countDocuments();
  const afterHasSub = await Lesson.countDocuments({ hasSubtitles: true });
  const afterPending = await Lesson.countDocuments({ hasSubtitles: { $ne: true } });

  console.log(`\n=== AFTER BACKFILL ===`);
  console.log(`Total Lessons: ${afterTotal}`);
  console.log(`Lessons with hasSubtitles: true: ${afterHasSub}`);
  console.log(`Pending / Without Subtitles: ${afterPending}`);

  // List any pending lessons if any remain
  if (afterPending > 0) {
    const pendingList = await Lesson.find({ hasSubtitles: { $ne: true } }, { title: 1, youtubeUrl: 1, youtubeId: 1, transcriptStatus: 1, transcriptLastError: 1 });
    console.log('Pending lessons detail:', pendingList);
  }

  await mongoose.disconnect();
  console.log('\nDisconnected from MongoDB. Done!');
}

run().catch(err => {
  console.error('Error in live backfill:', err);
  process.exit(1);
});
