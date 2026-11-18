const mongoose = require("mongoose");

const lessonSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true }, // e.g. les-civil-1
  courseId: { type: String, required: true, index: true },
  module: { type: String, default: "" },
  title: { type: String, required: true },
  duration: { type: String, default: "" },
  youtubeId: { type: String, default: "", index: true }, // Extracted 11-char YouTube ID
  youtubeUrl: { type: String, default: "" }, // Full YouTube URL
  chapter: { type: String, default: "" }, // Optional chapter/section title
  releaseDate: { type: String, default: "" },
  resources: [{ type: String }],
  description: { type: String, default: "" },
  order: { type: Number, default: 0 },
  status: { type: String, default: "published" }, // draft | published
  isDraft: { type: Boolean, default: false },

  // Comprehensive Transcript Schema (Phase 7)
  transcript: { type: String, default: "" }, // Extracted or manually saved full transcript text
  transcriptStatus: {
    type: String,
    default: "none",
    index: true
    // Statuses: none | ready | pending | processing | retry_scheduled | no_captions | invalid_id | private_or_restricted | network_error | rate_limited | unsupported_language | failed | manual
  },
  transcriptLanguage: { type: String, default: "" },
  transcriptSource: { type: String, default: "" }, // youtube_caption | srt_vtt_upload | manual_text
  transcriptSegments: [{
    timestamp: { type: String },
    offsetSeconds: { type: Number },
    text: { type: String }
  }],
  transcriptWordCount: { type: Number, default: 0 },
  transcriptUpdatedAt: { type: Date, default: null },
  transcriptLastAttemptAt: { type: Date, default: null },
  transcriptNextRetryAt: { type: Date, default: null, index: true },
  transcriptAttemptCount: { type: Number, default: 0 },
  transcriptLastError: { type: String, default: "" },
  transcriptVideoId: { type: String, default: "" },

  notifiedAt: { type: Date, default: null } // Video publication notification timestamp
}, { timestamps: true });

module.exports = mongoose.model("Lesson", lessonSchema);
