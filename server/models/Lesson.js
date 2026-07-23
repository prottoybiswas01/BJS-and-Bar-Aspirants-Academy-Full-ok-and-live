const mongoose = require("mongoose");

const lessonSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true }, // e.g. les-civil-1
  courseId: { type: String, required: true, index: true },
  module: { type: String, default: "General Classes" },
  title: { type: String, required: true },
  duration: { type: String, default: "45min" },
  youtubeId: { type: String, default: "" }, // Extracted 11-char YouTube ID
  releaseDate: { type: String, default: "" },
  resources: [{ type: String }],
  description: { type: String, default: "" },
}, { timestamps: true });

module.exports = mongoose.model("Lesson", lessonSchema);
