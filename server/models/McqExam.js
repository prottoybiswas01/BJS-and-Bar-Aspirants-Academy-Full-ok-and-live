const mongoose = require("mongoose");

const McqQuestionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  questionText: { type: String, required: true },
  options: [{ type: String, required: true }], // Array of 4 choices [A, B, C, D]
  correctIndex: { type: Number, required: true }, // 0, 1, 2, or 3
  explanation: { type: String, default: "" } // Detailed explanation/ব্যাখ্যা
});

const McqExamSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  courseId: { type: String, default: "" },
  courseTitle: { type: String, default: "" },
  durationMinutes: { type: Number, default: 30 },
  totalMarks: { type: Number, default: 40 },
  passPercentage: { type: Number, default: 50 },
  isPublic: { type: Boolean, default: true },
  status: { type: String, default: "Active" }, // Active / Closed
  questions: [McqQuestionSchema],
  createdBy: { type: String, default: "Admin" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("McqExam", McqExamSchema);
