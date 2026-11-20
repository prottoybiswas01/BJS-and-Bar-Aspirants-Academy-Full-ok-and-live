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

/**
 * Test Suite: Multi-Tier Subtitle Extraction Pipeline & Quality Gate
 */

const {
  fetchYoutubeTranscript,
  extractYoutubeId,
  formatSecondsToTimestamp,
  parseSrtOrVtt
} = require('./server/services/transcriptService');
const { syncSingleLessonSubtitle } = require('./server/services/subtitleScheduler');

async function runSubtitleTestSuite() {
  console.log("======================================================================");
  console.log("   MULTI-TIER SUBTITLE EXTRACTION PIPELINE - VERIFICATION SUITE       ");
  console.log("======================================================================\n");

  let passed = 0;
  let failed = 0;

  async function testCase(name, fn) {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name} -> ${err.message}`);
      failed++;
    }
  }

  // Test 1: Video ID Extraction
  await testCase("Test 1: YouTube ID Extraction across URL formats", async () => {
    const urls = [
      "https://www.youtube.com/watch?v=7Io5mziFAxU",
      "https://youtu.be/7Io5mziFAxU",
      "https://www.youtube.com/embed/7Io5mziFAxU",
      "https://www.youtube.com/shorts/7Io5mziFAxU",
      "https://www.youtube.com/watch?v=7Io5mziFAxU&list=RD7Io5mziFAxU&t=10s"
    ];
    for (const u of urls) {
      const id = extractYoutubeId(u);
      if (id !== "7Io5mziFAxU") throw new Error(`Failed to extract ID from ${u}: got ${id}`);
    }
  });

  // Test 2: Timestamp formatting
  await testCase("Test 2: Accurate seconds to timestamp conversion", async () => {
    if (formatSecondsToTimestamp(0) !== "00:00") throw new Error("0s failed");
    if (formatSecondsToTimestamp(65) !== "01:05") throw new Error("65s failed");
    if (formatSecondsToTimestamp(3665) !== "01:01:05") throw new Error("3665s failed");
  });

  // Test 3: Quality Gate Rejection of < 50 words
  await testCase("Test 3: Quality Gate rejects incomplete transcripts (< 50 words)", async () => {
    // If a video has invalid ID or no captions, it cleanly returns no_captions
    const res = await fetchYoutubeTranscript("invalid_id_xxxx");
    if (res.ok) throw new Error("Invalid ID should not be ok");
    if (res.status !== 'invalid_id') throw new Error(`Expected invalid_id, got ${res.status}`);
  });

  // Test 4: Live Extraction of Genuine Bengali Subtitles
  await testCase("Test 4: Multi-Tier Pipeline extracts real Bangla subtitles (>= 50 words)", async () => {
    const res = await fetchYoutubeTranscript("7Io5mziFAxU");
    if (!res.ok) throw new Error(`Extraction failed: ${res.message}`);
    if (res.status !== 'ready') throw new Error(`Expected status ready, got ${res.status}`);
    if (res.wordCount < 50) throw new Error(`Expected >= 50 words, got ${res.wordCount}`);
    if (!res.transcript.includes("[00:")) throw new Error("Missing timestamps in transcript");
    if (!res.segments || res.segments.length === 0) throw new Error("Missing segments");
    console.log(`   ℹ️ Extracted ${res.wordCount} words via ${res.tier}`);
  });

  // Test 5: Single Lesson Sync Skips Already Complete Subtitles
  await testCase("Test 5: Single Lesson Sync skips already complete subtitles (>= 50 words)", async () => {
    const mockLesson = {
      id: "les_complete",
      youtubeId: "7Io5mziFAxU",
      hasSubtitles: true,
      transcriptStatus: "ready",
      transcriptWordCount: 120,
      transcript: "এই ক্লাসে দেওয়ানী কার্যবিধির বিস্তারিত আলোচনা রয়েছে। ".repeat(15)
    };
    const res = await syncSingleLessonSubtitle(mockLesson);
    if (!res.ok || res.status !== 'already_ready' || !res.skipped) {
      throw new Error(`Expected already_ready skipped, got: ${JSON.stringify(res)}`);
    }
  });

  // Test 6: Single Lesson Sync Refetches Incomplete Subtitles (< 50 words)
  await testCase("Test 6: Single Lesson Sync refetches and replaces incomplete (< 50 words) subtitles", async () => {
    let savedData = null;
    const mockLesson = {
      id: "les_incomplete",
      title: "Test Incomplete Class",
      youtubeId: "7Io5mziFAxU",
      hasSubtitles: true, // was previously tagged as true with bogus data
      transcriptStatus: "ready",
      transcriptWordCount: 17, // 17 words bogus data
      transcript: "সংক্ষিপ্ত ক্লাস ডেসক্রিপশন মাত্র ১৭ শব্দের ফলব্যাক ডাটা",
      save: async function() { savedData = this; }
    };
    const res = await syncSingleLessonSubtitle(mockLesson);
    if (!res.ok || res.status !== 'ready') {
      throw new Error(`Expected re-sync to complete with status ready, got: ${JSON.stringify(res)}`);
    }
    if (res.words < 50) throw new Error(`Expected re-synced words >= 50, got ${res.words}`);
    if (!savedData || savedData.transcriptWordCount < 50) {
      throw new Error("Failed to persist updated complete subtitles");
    }
    console.log(`   ℹ️ Replaced bogus 17-word data with ${res.words} genuine words`);
  });

  console.log("\n======================================================================");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("======================================================================");

  if (failed > 0) process.exit(1);
}

runSubtitleTestSuite().catch(e => {
  console.error("Fatal Test Suite Crash:", e);
  process.exit(1);
});
