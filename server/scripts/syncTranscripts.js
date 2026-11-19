/**
 * BJS & Bar Aspirants Academy - Automated Video Transcript Backfill Engine
 * Supports:
 * - Read-only dry-run mode (--dry-run)
 * - Safe target database selection (--dbName=bjs_academy_test or --dbName=bjs_academy)
 * - Skips already completed transcripts (transcriptStatus === 'ready')
 * - Strictly preserves manual imports (transcriptStatus === 'manual')
 * - Full metadata persistence (segments, wordCount, language, source, timestamp)
 * - Comprehensive breakdown summary
 */

require('dotenv').config({ path: 'server/.env' });
const mongoose = require('mongoose');
const { fetchYoutubeTranscript, extractYoutubeId } = require('../services/transcriptService');

async function runBackfill(options = {}) {
  const isDryRun = options.dryRun || process.argv.includes('--dry-run');
  const targetDb = options.dbName || (process.argv.find(a => a.startsWith('--dbName=')) || '').split('=')[1] || process.env.MONGODB_DB || 'bjs_academy';
  const batchLimit = parseInt(options.limit || (process.argv.find(a => a.startsWith('--limit=')) || '').split('=')[1] || '100', 10);

  console.log('========================================================');
  console.log(`🎬 VIDEO TRANSCRIPT BACKFILL ENGINE ${isDryRun ? '[DRY RUN - READ ONLY]' : '[LIVE SYNC]'}`);
  console.log(`Database: ${targetDb}`);
  console.log('========================================================\n');

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is missing.');
  }

  await mongoose.connect(mongoUri, { dbName: targetDb });
  const db = mongoose.connection.db;

  const lessons = await db.collection('lessons').find({}).toArray();
  console.log(`Total lessons found in database: ${lessons.length}`);

  const summary = {
    totalVideos: lessons.length,
    readyTranscripts: 0,
    newlySynchronized: 0,
    processing: 0,
    retryScheduled: 0,
    noAvailableCaptions: 0,
    failed: 0,
    manualActionRequired: 0,
    skippedManual: 0
  };

  const toProcess = [];

  for (const l of lessons) {
    const yId = l.youtubeId || extractYoutubeId(l.youtubeUrl);
    if (!yId) {
      summary.manualActionRequired++;
      continue;
    }

    if (l.transcriptStatus === 'manual') {
      summary.skippedManual++;
      summary.readyTranscripts++;
      continue;
    }

    if (l.transcriptStatus === 'ready' && l.transcript && l.transcript.length > 20) {
      summary.readyTranscripts++;
      continue;
    }

    if (l.transcriptStatus === 'no_captions') {
      summary.noAvailableCaptions++;
      continue;
    }

    if (l.transcriptStatus === 'processing') {
      summary.processing++;
    } else if (l.transcriptStatus === 'retry_scheduled') {
      summary.retryScheduled++;
    }

    toProcess.push({ lesson: l, youtubeId: yId });
  }

  console.log(`\nAlready completed / ready: ${summary.readyTranscripts} (including ${summary.skippedManual} manual imports)`);
  console.log(`Confirmed no captions: ${summary.noAvailableCaptions}`);
  console.log(`Eligible for synchronization: ${toProcess.length} (Batch limit: ${batchLimit})\n`);

  const batch = toProcess.slice(0, batchLimit);

  for (let i = 0; i < batch.length; i++) {
    const { lesson, youtubeId } = batch[i];
    console.log(`[${i + 1}/${batch.length}] Fetching captions for: "${lesson.title}" (${youtubeId})...`);

    if (isDryRun) {
      console.log(`    -> [DRY RUN] Would attempt caption fetch for ${youtubeId}`);
      continue;
    }

    try {
      const res = await fetchYoutubeTranscript(youtubeId);
      if (res.ok && res.status === 'ready' && res.transcript) {
        await db.collection('lessons').updateOne(
          { _id: lesson._id },
          {
            $set: {
              transcript: res.transcript,
              transcriptSegments: res.segments || [],
              transcriptWordCount: res.wordCount || 0,
              transcriptLanguage: res.language || 'bn',
              transcriptSource: res.source || 'youtube_caption',
              transcriptVideoId: youtubeId,
              transcriptStatus: 'ready',
              transcriptUpdatedAt: new Date(),
              transcriptLastError: ''
            }
          }
        );
        summary.newlySynchronized++;
        summary.readyTranscripts++;
        console.log(`    ✓ Ready: ${res.wordCount} words (${res.language})`);
      } else if (res.status === 'no_captions') {
        await db.collection('lessons').updateOne(
          { _id: lesson._id },
          {
            $set: {
              transcriptStatus: 'no_captions',
              transcriptLastError: res.message || 'No accessible captions on YouTube',
              transcriptUpdatedAt: new Date()
            }
          }
        );
        summary.noAvailableCaptions++;
        console.log(`    ℹ️ No captions available on YouTube`);
      } else {
        await db.collection('lessons').updateOne(
          { _id: lesson._id },
          {
            $set: {
              transcriptStatus: res.status || 'failed',
              transcriptLastError: res.message || 'Fetch failed',
              transcriptUpdatedAt: new Date()
            }
          }
        );
        summary.failed++;
        console.log(`    ✕ Fetch notice: ${res.message || res.status}`);
      }
    } catch (err) {
      summary.failed++;
      console.warn(`    ✕ Error for ${youtubeId}:`, err.message);
    }

    // Gentle rate limit delay (300ms)
    await new Promise(r => setTimeout(r, 300));
  }

  console.log('\n========================================================');
  console.log('TRANSCRIPT BACKFILL SUMMARY:');
  console.log(`  - Total Videos in DB:          ${summary.totalVideos}`);
  console.log(`  - Ready Transcripts:           ${summary.readyTranscripts}`);
  console.log(`  - Newly Synchronized:          ${summary.newlySynchronized}`);
  console.log(`  - Preserved Manual Imports:    ${summary.skippedManual}`);
  console.log(`  - No Available Captions:       ${summary.noAvailableCaptions}`);
  console.log(`  - Processing / Queued:         ${summary.processing}`);
  console.log(`  - Retry Scheduled:             ${summary.retryScheduled}`);
  console.log(`  - Failed / Blocked:            ${summary.failed}`);
  console.log(`  - Manual Action Required:      ${summary.manualActionRequired}`);
  console.log('========================================================\n');

  await mongoose.disconnect();
  return summary;
}

if (require.main === module) {
  runBackfill().then(() => process.exit(0)).catch(err => {
    console.error('Fatal backfill error:', err);
    process.exit(1);
  });
}

module.exports = { runBackfill };
