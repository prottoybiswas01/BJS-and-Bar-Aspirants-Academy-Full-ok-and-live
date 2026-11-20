// ============================================================================
// HARD PRODUCTION SAFETY GUARD: Blocks script execution against production DB
// ============================================================================
(() => {
  try { require('dotenv').config({ path: require('path').join(__dirname, '../server/.env') }); } catch (e) {}
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || '';
  const db = process.env.MONGODB_DB || '';
  const isExplicitTestDb = uri.includes('_test') || uri.includes('127.0.0.1') || uri.includes('localhost') || db.includes('_test');
  if (uri && !isExplicitTestDb) {
    console.error(`🚫 HARD SAFETY GUARD TRIGGERED: Script blocked! MONGODB_URI points to non-test database ("${db || 'production'}"). Execution aborted to protect real production data.`);
    process.exit(1);
  }
})();

const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });
const uri = process.env.MONGODB_URI;

async function check() {
  await mongoose.connect(uri, { dbName: 'bjs_academy' });
  const Lesson = mongoose.model('Lesson', new mongoose.Schema({}, { strict: false }));
  const total = await Lesson.countDocuments();
  const withTranscript = await Lesson.countDocuments({ transcript: { $exists: true, $ne: '' } });
  const withSubtitlesTrue = await Lesson.countDocuments({ hasSubtitles: true });
  const otherStatus = await Lesson.aggregate([{ $group: { _id: '$transcriptStatus', count: { $sum: 1 } } }]);
  console.log('Total Lessons:', total);
  console.log('With Transcript text:', withTranscript);
  console.log('hasSubtitles: true count:', withSubtitlesTrue);
  console.log('Status breakdown:', otherStatus);
  
  // Sample a lesson with transcript
  const sample = await Lesson.findOne(
    { transcript: { $exists: true, $ne: '' } },
    { title: 1, youtubeUrl: 1, youtubeId: 1, transcriptStatus: 1, hasSubtitles: 1, transcriptLanguage: 1, transcriptWordCount: 1 }
  );
  console.log('Sample with transcript:', sample);
  
  // Sample a lesson without transcript
  const sampleWithout = await Lesson.findOne(
    { $or: [{ transcript: { $exists: false } }, { transcript: '' }, { transcript: null }] },
    { title: 1, youtubeUrl: 1, youtubeId: 1, transcriptStatus: 1, hasSubtitles: 1 }
  );
  console.log('Sample without transcript:', sampleWithout);

  process.exit(0);
}
check().catch(e => { console.error(e); process.exit(1); });
