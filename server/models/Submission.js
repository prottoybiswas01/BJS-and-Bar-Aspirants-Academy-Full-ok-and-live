const mongoose = require("mongoose");

const SubmissionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  assignmentId: { type: String, required: true, index: true },
  studentId: { type: String, required: true, index: true },
  studentName: { type: String, default: "" },
  studentEmail: { type: String, default: "" },
  studentPhone: { type: String, default: "" },
  courseId: { type: String, default: "" },
  submissionText: { type: String, default: "" },
  attachmentUrl: { type: String, default: "" },
  imageUrls: [{ type: String }], // Array of handwritten answer sheet image URLs/Base64 strings
  marksObtained: { type: Number, default: null },
  feedback: { type: String, default: "" },
  gradedAt: { type: Date, default: null },
  gradedBy: { type: String, default: "" },
  canResubmit: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Submission", SubmissionSchema);
