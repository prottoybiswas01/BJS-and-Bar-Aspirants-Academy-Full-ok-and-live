const mongoose = require("mongoose");

const transcriptJobSchema = new mongoose.Schema({
  jobId: { type: String, required: true, unique: true, index: true },
  lessonId: { type: String, required: true, index: true },
  courseId: { type: String, required: true, index: true },
  youtubeId: { type: String, required: true, index: true },
  status: {
    type: String,
    enum: ["pending", "processing", "completed", "retry_scheduled", "failed"],
    default: "pending",
    index: true
  },
  attemptCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },
  nextRetryAt: { type: Date, default: Date.now, index: true },
  lastAttemptAt: { type: Date, default: null },
  lockedAt: { type: Date, default: null },
  lastError: { type: String, default: "" },
  resultStatus: { type: String, default: "" }, // ready | no_captions | invalid_id | private_or_restricted | network_error | rate_limited
  transcriptLanguage: { type: String, default: "" },
  wordCount: { type: Number, default: 0 }
}, { timestamps: true });

// Compound index for querying due jobs with concurrency lock
transcriptJobSchema.index({ status: 1, nextRetryAt: 1, lockedAt: 1 });

module.exports = mongoose.model("TranscriptJob", transcriptJobSchema);
