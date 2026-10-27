const mongoose = require("mongoose");

const lessonSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true }, // e.g. les-civil-1
  courseId: { type: String, required: true, index: true },
  module: { type: String, default: "" },
  title: { type: String, required: true },
  duration: { type: String, default: "" },
  youtubeId: { type: String, default: "" }, // Extracted 11-char YouTube ID
  youtubeUrl: { type: String, default: "" }, // Full YouTube URL e.g. https://youtu.be/7HNVqFCWZm4
  chapter: { type: String, default: "" }, // Optional chapter/section title e.g. "অধ্যায় ১: দেওয়ানী মামলা দায়ের"
  releaseDate: { type: String, default: "" },
  resources: [{ type: String }],
  description: { type: String, default: "" },
  order: { type: Number, default: 0 },
  transcript: { type: String, default: "" }, // Extracted or manually saved full transcript text
  transcriptStatus: { type: String, default: "none" }, // none | ready | failed | manual
  transcriptUpdatedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model("Lesson", lessonSchema);
