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

const { fetchYoutubeTranscript } = require('./server/services/transcriptService');

async function testFetch() {
  const ids = ['2_Pbw6Ow3yE', 'JgX_6916KkI', 'dRtyx7qwZVA'];
  for (const id of ids) {
    console.log(`Testing fetch for ${id}...`);
    const res = await fetchYoutubeTranscript(id);
    console.log(`Result for ${id}:`, {
      ok: res.ok,
      status: res.status,
      language: res.language,
      lineCount: res.lineCount,
      wordCount: res.wordCount,
      sample: res.transcript ? res.transcript.substring(0, 150) : res.message
    });
  }
}
testFetch().catch(console.error);
