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
