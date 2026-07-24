const mongoose = require("mongoose");

const lessonSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true }, // e.g. les-civil-1
  courseId: { type: String, required: true, index: true },
  module: { type: String, default: "Fast Class" },
  title: { type: String, required: true },
  duration: { type: String, default: "56min" },
  youtubeId: { type: String, default: "" }, // Extracted 11-char YouTube ID
  youtubeUrl: { type: String, default: "" }, // Full YouTube URL e.g. https://youtu.be/7HNVqFCWZm4
  chapter: { type: String, default: "" }, // Optional chapter/section title e.g. "অধ্যায় ১: দেওয়ানী মামলা দায়ের"
  releaseDate: { type: String, default: "" },
  resources: [{ type: String }],
  description: { type: String, default: "" },
}, { timestamps: true });

module.exports = mongoose.model("Lesson", lessonSchema);
