const { fetchYoutubeTranscript, extractYoutubeId } = require('./transcriptService');
const { notifySubtitleExtractionFailed, notifyPermanentTranscriptFailure } = require('./alertService');

let schedulerTimer = null;
let isJobRunning = false;

/**
 * Fetch and save YouTube subtitles for a single lesson.
 * Strict Rule: If the lesson already has subtitles (hasSubtitles: true & transcript text), skip completely!
 */
async function syncSingleLessonSubtitle(lessonDoc, LessonModel, { notifyOnFailure = true } = {}) {
  if (!lessonDoc) return { ok: false, message: 'No lesson provided' };

  const yId = lessonDoc.youtubeId || extractYoutubeId(lessonDoc.youtubeUrl);
  if (!yId) {
    return { ok: false, message: 'No valid YouTube ID found', skipped: true };
  }

  // CRITICAL CONDITION: Check for genuine, complete subtitles (>= 50 words)
  const existingWordCount = lessonDoc.transcriptWordCount || (lessonDoc.transcript ? lessonDoc.transcript.split(/\s+/).filter(Boolean).length : 0);
  if (lessonDoc.hasSubtitles === true && existingWordCount >= 50 && lessonDoc.transcriptStatus === 'ready') {
    return { ok: true, status: 'already_ready', skipped: true, youtubeId: yId, words: existingWordCount };
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

      // Real-time Telegram alert on subtitle extraction failure
      if (notifyOnFailure && lessonDoc.transcriptLastError !== result.message) {
        try {
          if (result.status === 'private_or_unavailable') {
            notifyPermanentTranscriptFailure({
              courseTitle: lessonDoc.courseTitle || lessonDoc.module || 'BJS Course',
              lessonTitle: lessonDoc.title || 'ক্লাস',
              youtubeId: yId,
              reason: result.message || 'ভিডিওটি Private করা আছে, Unlisted করুন'
            });
          } else {
            notifySubtitleExtractionFailed({
              courseTitle: lessonDoc.courseTitle || lessonDoc.module || 'BJS Course',
              lessonTitle: lessonDoc.title || 'ক্লাস',
              youtubeId: yId,
              reason: result.message || 'ক্যাপশন পাওয়া যায়নি বা ভিডিও প্রাইভেট'
            });
          }
        } catch (tgErr) {
          console.warn('[SubtitleSync] Telegram alert notice:', tgErr.message);
        }
      }

      return { ok: false, status: result.status || 'pending', youtubeId: yId, message: result.message };
    }
  } catch (err) {
    console.warn(`[SubtitleSync] ⚠️ Error syncing subtitles for "${lessonDoc.title}":`, err.message);
    if (notifyOnFailure) {
      try {
        notifySubtitleExtractionFailed({
          courseTitle: lessonDoc?.courseTitle || lessonDoc?.module || 'BJS Course',
          lessonTitle: lessonDoc?.title || 'ক্লাস',
          youtubeId: yId,
          reason: err.message
        });
      } catch (_) {}
    }
    return { ok: false, status: 'error', error: err.message };
  }
}

/**
 * Process a batch of pending/missing subtitle lessons
 * Strictly excludes any video that already has hasSubtitles: true
 */
async function syncPendingSubtitlesBatch({ limit = 10, LessonModel, notifyOnFailure = false } = {}) {
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
    if (LessonModel.db?.readyState !== 1) {
      isJobRunning = false;
      return summary;
    }
    // 1. One-time self-healing audit:
    // Reset any bogus/incomplete transcript (< 50 words) so it gets re-synced
    await LessonModel.updateMany(
      {
        $or: [
          { transcriptWordCount: { $lt: 50 } },
          { transcript: { $exists: false } },
          { transcript: '' },
          { transcript: null },
          { transcript: { $type: 'string', $regex: /^.{0,249}$/ } }
        ],
        transcriptStatus: { $ne: 'manual' },
        hasSubtitles: true
      },
      {
        $set: { hasSubtitles: false, transcriptStatus: 'pending' }
      }
    );

    // Mark lessons that genuinely have full transcripts (>= 50 words) as ready
    await LessonModel.updateMany(
      {
        transcript: { $exists: true, $type: 'string', $regex: /^.{250,}$/ },
        transcriptWordCount: { $gte: 50 },
        hasSubtitles: { $ne: true }
      },
      {
        $set: { hasSubtitles: true, transcriptStatus: 'ready' }
      }
    );

    // 2. Query lessons that still lack subtitles or have incomplete transcripts (< 50 words)
    const pendingLessons = await LessonModel.find({
      $and: [
        {
          $or: [
            { youtubeId: { $exists: true, $type: 'string', $regex: /^.{11}$/ } },
            { youtubeUrl: { $exists: true, $type: 'string', $regex: /youtu/ } }
          ]
        },
        { transcriptStatus: { $ne: 'manual' } },
        {
          $or: [
            { hasSubtitles: { $ne: true } },
            { transcriptStatus: { $in: ['pending', 'incomplete', 'no_captions', 'none', 'error'] } },
            { transcriptWordCount: { $lt: 50 } },
            { transcript: { $exists: false } },
            { transcript: '' },
            { transcript: null },
            { transcript: { $type: 'string', $regex: /^.{0,249}$/ } }
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

      const res = await syncSingleLessonSubtitle(lesson, LessonModel, { notifyOnFailure });
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

  // 1. Audit and reset any bogus/incomplete transcript (< 50 words)
  await LessonModel.updateMany(
    {
      $or: [
        { transcriptWordCount: { $lt: 50 } },
        { transcript: { $exists: false } },
        { transcript: '' },
        { transcript: null },
        { transcript: { $type: 'string', $regex: /^.{0,249}$/ } }
      ],
      transcriptStatus: { $ne: 'manual' },
      hasSubtitles: true
    },
    {
      $set: { hasSubtitles: false, transcriptStatus: 'pending' }
    }
  );

  // Tag genuine transcripts (>= 50 words) with hasSubtitles: true
  const taggedResult = await LessonModel.updateMany(
    {
      transcript: { $exists: true, $type: 'string', $regex: /^.{250,}$/ },
      transcriptWordCount: { $gte: 50 },
      hasSubtitles: { $ne: true }
    },
    {
      $set: { hasSubtitles: true, transcriptStatus: 'ready' }
    }
  );
  console.log(`[SubtitleSync] Verified ${taggedResult.modifiedCount || 0} genuine transcripts with hasSubtitles: true`);

  // 2. Loop until no more pending or maxTotal reached
  while (remaining && totalChecked < maxTotal) {
    batchesCount++;
    const batchRes = await syncPendingSubtitlesBatch({ limit: maxPerBatch, LessonModel, notifyOnFailure: true });
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
