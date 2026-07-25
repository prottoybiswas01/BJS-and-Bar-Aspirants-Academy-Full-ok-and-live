const mongoose = require("mongoose");

const McqResultSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  examId: { type: String, required: true, index: true },
  examTitle: { type: String, default: "" },
  studentId: { type: String, default: "", index: true }, // Auto-matched student ID if registered
  candidateName: { type: String, required: true },
  candidatePhone: { type: String, default: "" },
  candidateEmail: { type: String, default: "" },
  candidateUniversity: { type: String, default: "" },
  score: { type: Number, required: true },
  totalMarks: { type: Number, required: true },
  percentage: { type: Number, required: true },
  grade: { type: String, default: "Pass" }, // Distinction / Passed / Needs Practice
  userAnswers: [{
    questionId: String,
    selectedIndex: Number,
    correctIndex: Number,
    isCorrect: Boolean
  }],
  submittedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("McqResult", McqResultSchema);
