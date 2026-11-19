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
