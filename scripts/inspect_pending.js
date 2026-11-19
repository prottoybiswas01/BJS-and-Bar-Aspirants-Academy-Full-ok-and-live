const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });
const uri = process.env.MONGODB_URI;

async function checkPending() {
  await mongoose.connect(uri, { dbName: 'bjs_academy' });
  const Lesson = mongoose.model('Lesson', new mongoose.Schema({}, { strict: false }));
  const pendings = await Lesson.find({ $or: [{ transcriptStatus: 'pending' }, { transcript: '' }, { transcript: null }] }).lean();
  console.log('Pending lessons count:', pendings.length);
  pendings.forEach(p => {
    console.log(`- ID: ${p.id || p._id}, Title: ${p.title}, VideoId: ${p.youtubeId}, URL: ${p.youtubeUrl}, status: ${p.transcriptStatus}`);
  });
  process.exit(0);
}
checkPending().catch(e => { console.error(e); process.exit(1); });
