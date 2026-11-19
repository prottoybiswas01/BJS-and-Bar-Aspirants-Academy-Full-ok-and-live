const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });
const uri = process.env.MONGODB_URI;

async function checkJobs() {
  await mongoose.connect(uri, { dbName: 'bjs_academy' });
  const TranscriptJob = mongoose.model('TranscriptJob', new mongoose.Schema({}, { strict: false }));
  const jobs = await TranscriptJob.find().lean();
  console.log('Total TranscriptJobs in MongoDB:', jobs.length);
  jobs.forEach(j => {
    console.log(`- Job ${j.jobId}, youtubeId: ${j.youtubeId}, status: ${j.status}, attempts: ${j.attemptCount}`);
  });
  process.exit(0);
}
checkJobs().catch(e => { console.error(e); process.exit(1); });
