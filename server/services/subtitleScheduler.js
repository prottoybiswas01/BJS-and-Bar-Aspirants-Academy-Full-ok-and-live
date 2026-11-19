const { fetchYoutubeTranscript, extractYoutubeId } = require('./transcriptService');

let schedulerTimer = null;
let isJobRunning = false;

/**
 * Fetch and save YouTube subtitles for a single lesson.
 * Strict Rule: If the lesson already has subtitles (hasSubtitles: true & transcript text), skip completely!
 */
async function syncSingleLessonSubtitle(lessonDoc, LessonModel) {
  if (!lessonDoc) return { ok: false, message: 'No lesson provided' };

  const yId = lessonDoc.youtubeId || extractYoutubeId(lessonDoc.youtubeUrl);
  if (!yId) {
    return { ok: false, message: 'No valid YouTube ID found', skipped: true };
  }

  // CRITICAL CONDITION: Never re-fetch if already has valid subtitles saved
  if (lessonDoc.hasSubtitles === true && lessonDoc.transcript && lessonDoc.transcript.length > 20) {
    return { ok: true, status: 'already_ready', skipped: true, youtubeId: yId };
  }

  try {
    const result = await fetchYoutubeTranscript(yId);

    if (result.ok && result.status === 'ready' && result.transcript) {
      const updateData = {
        hasSubtitles: true,
        transcript: result.transcript,
        transcriptSegments: result.segments || [],
        transcriptWordCount: result.wordCount || 0,
        transcriptLanguage: result.language || 'bn',
        transcriptSource: result.source || 'youtube_caption',
        transcriptVideoId: yId,
        transcriptStatus: 'ready',
        transcriptUpdatedAt: new Date(),
        transcriptLastError: '',
        transcriptLastAttemptAt: new Date()
      };

      if (LessonModel) {
        await LessonModel.updateOne(
          { $or: [{ id: lessonDoc.id }, { _id: lessonDoc._id }] },
          { $set: updateData }
        );
      } else if (typeof lessonDoc.save === 'function') {
        Object.assign(lessonDoc, updateData);
        await lessonDoc.save();
      }

      console.log(`[SubtitleSync] ✓ Successfully saved subtitles for: "${lessonDoc.title}" (${result.wordCount} words, lang: ${result.language})`);
      return { ok: true, status: 'ready', youtubeId: yId, words: result.wordCount, language: result.language };
    } else {
      // Subtitles not ready yet or pending on YouTube
      const updateData = {
        hasSubtitles: false,
        transcriptStatus: result.status || 'pending',
        transcriptLastError: result.message || 'Subtitles pending on YouTube',
        transcriptLastAttemptAt: new Date()
      };

      if (LessonModel) {
        await LessonModel.updateOne(
          { $or: [{ id: lessonDoc.id }, { _id: lessonDoc._id }] },
          { $set: updateData }
        );
      }

      console.log(`[SubtitleSync] ⏳ Pending/Waiting for subtitles: "${lessonDoc.title}" (${result.status}: ${result.message})`);
      return { ok: false, status: result.status || 'pending', youtubeId: yId, message: result.message };
    }
  } catch (err) {
    console.warn(`[SubtitleSync] ⚠️ Error syncing subtitles for "${lessonDoc.title}":`, err.message);
    return { ok: false, status: 'error', error: err.message };
  }
}

/**
 * Process a batch of pending/missing subtitle lessons
 * Strictly excludes any video that already has hasSubtitles: true
 */
async function syncPendingSubtitlesBatch({ limit = 10, LessonModel } = {}) {
  if (!LessonModel) return { ok: false, message: 'LessonModel required' };

  if (isJobRunning) {
    return { ok: false, message: 'Another subtitle sync job is currently running', skipped: true };
  }

  isJobRunning = true;
  const summary = {
    totalChecked: 0,
    syncedCount: 0,
    pendingCount: 0,
    failedCount: 0,
    details: []
  };

  try {
    // 1. One-time self-healing audit:
    // Mark any lesson that already has valid transcript text (> 25 chars) as hasSubtitles: true
    await LessonModel.updateMany(
      {
        transcript: { $exists: true, $type: 'string', $regex: /^.{25,}$/ },
        hasSubtitles: { $ne: true }
      },
      {
        $set: { hasSubtitles: true, transcriptStatus: 'ready' }
      }
    );

    // 2. Query ONLY lessons that still lack subtitles
    // CRITICAL: Strictly filters out hasSubtitles: true
    const pendingLessons = await LessonModel.find({
      $and: [
        {
          $or: [
            { youtubeId: { $exists: true, $type: 'string', $regex: /^.{11}$/ } },
            { youtubeUrl: { $exists: true, $type: 'string', $regex: /youtu/ } }
          ]
        },
        { hasSubtitles: { $ne: true } },
        { transcriptStatus: { $ne: 'manual' } },
        {
          $or: [
            { transcript: { $exists: false } },
            { transcript: '' },
            { transcript: null },
            { transcript: { $type: 'string', $regex: /^.{0,24}$/ } }
          ]
        }
      ]
    }).limit(limit);

    summary.totalChecked = pendingLessons.length;

    for (let i = 0; i < pendingLessons.length; i++) {
      const lesson = pendingLessons[i];

      // YouTube Rate-Limit Protection: delay 1500ms between calls
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      const res = await syncSingleLessonSubtitle(lesson, LessonModel);
      if (res.ok && res.status === 'ready') {
        summary.syncedCount++;
      } else if (res.status === 'pending' || res.status === 'no_captions' || res.status === 'retry_scheduled') {
        summary.pendingCount++;
      } else {
        summary.failedCount++;
      }

      summary.details.push({
        id: lesson.id,
        title: lesson.title,
        status: res.status,
        words: res.words || 0
      });
    }

    return { ok: true, summary };
  } catch (err) {
    console.error('[SubtitleSync] Batch sync error:', err);
    return { ok: false, error: err.message, summary };
  } finally {
    isJobRunning = false;
  }
}

/**
 * Start the Automated 30-Minute Recurring Cron Job
 */
function startSubtitleScheduler({ LessonModel, intervalMinutes = 30 } = {}) {
  if (schedulerTimer) {
    console.log('[SubtitleSync] Scheduler is already active.');
    return;
  }

  const intervalMs = Math.max(10, intervalMinutes) * 60 * 1000;
  console.log(`[SubtitleSync] 🕒 Starting automated Subtitle Scheduler (runs every ${intervalMinutes} mins)...`);

  // Initial run after 15 seconds of boot
  setTimeout(async () => {
    try {
      console.log('[SubtitleSync] 🚀 Running initial startup subtitle check...');
      await syncPendingSubtitlesBatch({ limit: 10, LessonModel });
    } catch (e) {
      console.warn('[SubtitleSync] Initial check notice:', e.message);
    }
  }, 15000);

  // Recurring interval
  schedulerTimer = setInterval(async () => {
    try {
      console.log('[SubtitleSync] ⏰ Running scheduled 30-min subtitle check...');
      await syncPendingSubtitlesBatch({ limit: 10, LessonModel });
    } catch (e) {
      console.warn('[SubtitleSync] Scheduled check notice:', e.message);
    }
  }, intervalMs);
}

/**
 * Full Backfill of all uploaded lessons without subtitles
 * Loops through batches until all eligible lessons are processed
 */
async function backfillAllExistingSubtitles({ LessonModel, maxPerBatch = 10, maxTotal = 150 } = {}) {
  if (!LessonModel) return { ok: false, message: 'LessonModel required' };

  console.log('[SubtitleSync] 🔄 Starting Full Backfill of all existing lessons...');
  let totalSynced = 0;
  let totalChecked = 0;
  let remaining = true;
  let batchesCount = 0;

  // 1. Audit and tag existing ready transcripts
  const taggedResult = await LessonModel.updateMany(
    {
      transcript: { $exists: true, $type: 'string', $regex: /^.{25,}$/ },
      hasSubtitles: { $ne: true }
    },
    {
      $set: { hasSubtitles: true, transcriptStatus: 'ready' }
    }
  );
  console.log(`[SubtitleSync] Tagged ${taggedResult.modifiedCount || 0} existing transcripts with hasSubtitles: true`);

  // 2. Loop until no more pending or maxTotal reached
  while (remaining && totalChecked < maxTotal) {
    batchesCount++;
    const batchRes = await syncPendingSubtitlesBatch({ limit: maxPerBatch, LessonModel });
    if (!batchRes.ok || !batchRes.summary || batchRes.summary.totalChecked === 0) {
      remaining = false;
      break;
    }

    totalChecked += batchRes.summary.totalChecked;
    totalSynced += batchRes.summary.syncedCount;

    if (batchRes.summary.totalChecked < maxPerBatch) {
      remaining = false;
    } else {
      // Pause 3 seconds between batches
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  const finalStats = {
    totalChecked,
    totalSynced,
    batchesProcessed: batchesCount
  };

  console.log('[SubtitleSync] 🏁 Full Backfill complete:', finalStats);
  return { ok: true, ...finalStats };
}

module.exports = {
  syncSingleLessonSubtitle,
  syncPendingSubtitlesBatch,
  startSubtitleScheduler,
  backfillAllExistingSubtitles
};
