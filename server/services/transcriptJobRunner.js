const { fetchYoutubeTranscript, extractYoutubeId } = require('./transcriptService');

/**
 * Enqueue a durable transcript processing job
 */
async function enqueueTranscriptJob({ lessonId, courseId, youtubeId, TranscriptJobModel, isMongoConnected, memoryDb }) {
  if (!lessonId || !youtubeId) return null;

  const jobId = `tr-job-${lessonId}`;

  if (isMongoConnected && TranscriptJobModel) {
    try {
      const existing = await TranscriptJobModel.findOne({ jobId });
      if (existing) {
        // If same youtubeId and already completed, do not duplicate
        if (existing.youtubeId === youtubeId && existing.status === 'completed') {
          return existing;
        }
        // Update existing job for new/retried video
        existing.youtubeId = youtubeId;
        existing.courseId = courseId || existing.courseId;
        existing.status = 'pending';
        existing.attemptCount = 0;
        existing.nextRetryAt = new Date();
        existing.lockedAt = null;
        existing.lastError = '';
        await existing.save();
        return existing;
      }

      const created = await TranscriptJobModel.create({
        jobId,
        lessonId,
        courseId: courseId || '',
        youtubeId,
        status: 'pending',
        attemptCount: 0,
        nextRetryAt: new Date()
      });
      return created;
    } catch (e) {
      console.warn('[TranscriptJob] Error enqueuing mongo job:', e.message);
    }
  }

  // Memory fallback
  if (memoryDb) {
    memoryDb.transcriptJobs = memoryDb.transcriptJobs || [];
    let memJob = memoryDb.transcriptJobs.find(j => j.jobId === jobId);
    if (!memJob) {
      memJob = {
        jobId,
        lessonId,
        courseId: courseId || '',
        youtubeId,
        status: 'pending',
        attemptCount: 0,
        nextRetryAt: new Date()
      };
      memoryDb.transcriptJobs.push(memJob);
    } else {
      memJob.youtubeId = youtubeId;
      memJob.status = 'pending';
      memJob.attemptCount = 0;
      memJob.nextRetryAt = new Date();
      memJob.lockedAt = null;
    }
    return memJob;
  }

  return null;
}

/**
 * Process due transcript jobs with exponential backoff and stale-lock recovery
 */
async function processDueTranscriptJobs({ limit = 5, LessonModel, TranscriptJobModel, isMongoConnected, memoryDb }) {
  const processed = [];
  const now = new Date();

  if (isMongoConnected && TranscriptJobModel && LessonModel) {
    try {
      // 1. Recover stale locks (jobs stuck in processing for > 60 seconds)
      const staleThreshold = new Date(Date.now() - 60000);
      await TranscriptJobModel.updateMany(
        { status: 'processing', lockedAt: { $lt: staleThreshold } },
        { $set: { status: 'pending', lockedAt: null } }
      );

      // 2. Query due jobs
      const dueJobs = await TranscriptJobModel.find({
        status: { $in: ['pending', 'retry_scheduled'] },
        nextRetryAt: { $lte: now }
      }).limit(limit);

      for (const job of dueJobs) {
        // Atomically lock job
        const locked = await TranscriptJobModel.findOneAndUpdate(
          { _id: job._id, status: { $in: ['pending', 'retry_scheduled'] } },
          { $set: { status: 'processing', lockedAt: new Date(), lastAttemptAt: new Date() } },
          { new: true }
        );
        if (!locked) continue; // Concurrency check: acquired by another worker

        const result = await fetchYoutubeTranscript(locked.youtubeId);
        const lesson = await LessonModel.findOne({ id: locked.lessonId });

        if (result.ok && result.status === 'ready') {
          // Success
          if (lesson && lesson.transcriptStatus !== 'manual') {
            lesson.transcript = result.transcript;
            lesson.transcriptStatus = 'ready';
            lesson.transcriptLanguage = result.language || 'bn';
            lesson.transcriptSource = result.source || 'youtube_caption';
            lesson.transcriptSegments = result.segments || [];
            lesson.transcriptWordCount = result.wordCount || 0;
            lesson.transcriptVideoId = result.youtubeId;
            lesson.transcriptUpdatedAt = new Date();
            lesson.transcriptLastError = '';
            await lesson.save();
          }

          locked.status = 'completed';
          locked.resultStatus = 'ready';
          locked.transcriptLanguage = result.language || 'bn';
          locked.wordCount = result.wordCount || 0;
          locked.lockedAt = null;
          locked.lastError = '';
          await locked.save();

          processed.push({ jobId: locked.jobId, lessonId: locked.lessonId, status: 'ready', words: result.wordCount });
        } else {
          // Failure
          const nextAttempt = (locked.attemptCount || 0) + 1;
          const isRetryable = result.retryable && nextAttempt < (locked.maxRetries || 3);

          if (isRetryable) {
            const backoffMs = Math.pow(2, nextAttempt) * 15000; // 15s, 30s, 60s
            const nextRetry = new Date(Date.now() + backoffMs);

            locked.status = 'retry_scheduled';
            locked.attemptCount = nextAttempt;
            locked.nextRetryAt = nextRetry;
            locked.lastError = result.message || 'Transient fetch error';
            locked.lockedAt = null;
            await locked.save();

            if (lesson && lesson.transcriptStatus !== 'manual') {
              lesson.transcriptStatus = 'retry_scheduled';
              lesson.transcriptAttemptCount = nextAttempt;
              lesson.transcriptNextRetryAt = nextRetry;
              lesson.transcriptLastError = result.message || '';
              await lesson.save();
            }

            processed.push({ jobId: locked.jobId, lessonId: locked.lessonId, status: 'retry_scheduled', attempt: nextAttempt });
          } else {
            // Permanent failure
            const finalStatus = result.status || 'failed';
            locked.status = 'failed';
            locked.resultStatus = finalStatus;
            locked.lastError = result.message || 'Exceeded max retries';
            locked.lockedAt = null;
            await locked.save();

            if (lesson && lesson.transcriptStatus !== 'manual') {
              lesson.transcriptStatus = finalStatus;
              lesson.transcriptLastError = result.message || '';
              await lesson.save();
            }

            processed.push({ jobId: locked.jobId, lessonId: locked.lessonId, status: finalStatus, error: result.message });
          }
        }
      }
    } catch (err) {
      console.warn('[TranscriptJob] Worker loop error:', err.message);
    }
  }

  return processed;
}

/**
 * Get current Queue Status summary
 */
async function getQueueStatus({ TranscriptJobModel, isMongoConnected, memoryDb }) {
  if (isMongoConnected && TranscriptJobModel) {
    try {
      const counts = await TranscriptJobModel.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]);
      const result = {
        pending: 0,
        processing: 0,
        retry_scheduled: 0,
        completed: 0,
        failed: 0,
        total: 0
      };
      counts.forEach(c => {
        if (result[c._id] !== undefined) result[c._id] = c.count;
        result.total += c.count;
      });
      return result;
    } catch (e) {}
  }

  // Memory fallback
  const jobs = (memoryDb && memoryDb.transcriptJobs) ? memoryDb.transcriptJobs : [];
  return {
    pending: jobs.filter(j => j.status === 'pending').length,
    processing: jobs.filter(j => j.status === 'processing').length,
    retry_scheduled: jobs.filter(j => j.status === 'retry_scheduled').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    failed: jobs.filter(j => j.status === 'failed').length,
    total: jobs.length
  };
}

module.exports = {
  enqueueTranscriptJob,
  processDueTranscriptJobs,
  getQueueStatus
};
