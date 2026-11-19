/**
 * BJS & Bar Aspirants Academy - Automated Video Transcript Backfill & Sync Engine
 * Local execution script (runs on local residential IP without Datacenter blocks)
 * Supports:
 * - Read-only dry-run mode (--dry-run)
 * - Force sync mode (--force)
 * - Safe target database selection (--dbName=bjs_academy)
 * - Auto-recovers existing transcripts in DB with >= 50 words
 * - Saves hasSubtitles: true and transcriptStatus: 'ready'
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const { fetchYoutubeTranscript, extractYoutubeId } = require('../services/transcriptService');

async function runBackfill(options = {}) {
  const isDryRun = options.dryRun || process.argv.includes('--dry-run');
  const isForce = options.force || process.argv.includes('--force');
  const targetDb = options.dbName || (process.argv.find(a => a.startsWith('--dbName=')) || '').split('=')[1] || process.env.MONGODB_DB || 'bjs_academy';
  const batchLimit = parseInt(options.limit || (process.argv.find(a => a.startsWith('--limit=')) || '').split('=')[1] || '200', 10);

  console.log('========================================================');
  console.log(`🎬 VIDEO TRANSCRIPT BACKFILL ENGINE ${isDryRun ? '[DRY RUN]' : '[LIVE SYNC]'}`);
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
    recoveredFromDb: 0,
    noAvailableCaptions: 0,
    failed: 0,
    skippedManual: 0
  };

  const toFetch = [];

  for (const l of lessons) {
    const yId = l.youtubeId || extractYoutubeId(l.youtubeUrl);
    const existingWords = l.transcriptWordCount || (l.transcript ? String(l.transcript).split(/\s+/).filter(Boolean).length : 0);

    // 1. Preserve manual edits
    if (l.transcriptStatus === 'manual') {
      summary.skippedManual++;
      summary.readyTranscripts++;
      continue;
    }

    // 2. Auto-recover: if DB already contains full transcript (>= 50 words) but status was incorrectly marked 'no_captions'
    if (existingWords >= 50 && l.transcript && l.transcriptStatus !== 'ready') {
      if (!isDryRun) {
        await db.collection('lessons').updateOne(
          { _id: l._id },
          {
            $set: {
              hasSubtitles: true,
              transcriptStatus: 'ready',
              transcriptWordCount: existingWords,
              transcriptUpdatedAt: new Date(),
              transcriptLastError: ''
            }
          }
        );
      }
      summary.recoveredFromDb++;
      summary.readyTranscripts++;
      console.log(`  ✓ Auto-recovered existing ${existingWords} words for: "${l.title}"`);
      continue;
    }

    // 3. Skip already ready lessons unless --force is specified
    if (!isForce && l.transcriptStatus === 'ready' && existingWords >= 50) {
      summary.readyTranscripts++;
      continue;
    }

    if (!yId) {
      continue;
    }

    toFetch.push({ lesson: l, youtubeId: yId });
  }

  console.log(`\nAlready ready / recovered: ${summary.readyTranscripts} (including ${summary.skippedManual} manual imports, ${summary.recoveredFromDb} auto-recovered)`);
  console.log(`Eligible for YouTube fetch: ${toFetch.length} (Batch limit: ${batchLimit})\n`);

  const batch = toFetch.slice(0, batchLimit);

  for (let i = 0; i < batch.length; i++) {
    const { lesson, youtubeId } = batch[i];
    console.log(`[${i + 1}/${batch.length}] Fetching YouTube captions for: "${lesson.title}" (${youtubeId})...`);

    if (isDryRun) {
      console.log(`    -> [DRY RUN] Would attempt fetch for ${youtubeId}`);
      continue;
    }

    try {
      const res = await fetchYoutubeTranscript(youtubeId);
      if (res.ok && res.status === 'ready' && res.transcript && res.wordCount >= 50) {
        await db.collection('lessons').updateOne(
          { _id: lesson._id },
          {
            $set: {
              hasSubtitles: true,
              transcript: res.transcript,
              transcriptSegments: res.segments || [],
              transcriptWordCount: res.wordCount || 0,
              transcriptLanguage: res.language || 'bn',
              transcriptSource: res.tier || 'youtube_caption',
              transcriptVideoId: youtubeId,
              transcriptStatus: 'ready',
              transcriptUpdatedAt: new Date(),
              transcriptLastError: ''
            }
          }
        );
        summary.newlySynchronized++;
        summary.readyTranscripts++;
        console.log(`    ✓ Ready: ${res.wordCount} words (${res.language}) via ${res.tier}`);
      } else {
        const finalStatus = res.status || 'no_captions';
        await db.collection('lessons').updateOne(
          { _id: lesson._id },
          {
            $set: {
              hasSubtitles: false,
              transcriptStatus: finalStatus,
              transcriptLastError: res.message || 'No captions found',
              transcriptUpdatedAt: new Date()
            }
          }
        );
        if (finalStatus === 'no_captions' || finalStatus === 'NO_CAPTIONS_AVAILABLE') {
          summary.noAvailableCaptions++;
          console.log(`    ℹ️ No captions on YouTube: ${res.message}`);
        } else {
          summary.failed++;
          console.log(`    ⚠️ Fetch notice [${finalStatus}]: ${res.message}`);
        }
      }
    } catch (err) {
      summary.failed++;
      console.warn(`    ✖ Error for ${youtubeId}:`, err.message);
    }

    // Respectful rate limit delay between requests
    await new Promise(r => setTimeout(r, 400));
  }

  console.log('\n========================================================');
  console.log('TRANSCRIPT BACKFILL SUMMARY:');
  console.log(`  - Total Videos in DB:          ${summary.totalVideos}`);
  console.log(`  - Ready Transcripts:           ${summary.readyTranscripts}`);
  console.log(`  - Newly Synchronized:          ${summary.newlySynchronized}`);
  console.log(`  - Auto-Recovered in DB:        ${summary.recoveredFromDb}`);
  console.log(`  - Preserved Manual Imports:    ${summary.skippedManual}`);
  console.log(`  - Confirmed No Captions:       ${summary.noAvailableCaptions}`);
  console.log(`  - Failed / Blocked:            ${summary.failed}`);
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
