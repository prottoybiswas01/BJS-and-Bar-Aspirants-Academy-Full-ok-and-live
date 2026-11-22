const mongoose = require("mongoose");

const CertificateSchema = new mongoose.Schema({
  certificateId: { type: String, required: true, unique: true, index: true },
  studentId: { type: String, required: true, index: true },
  studentName: { type: String, required: true },
  courseId: { type: String, required: true },
  courseTitle: { type: String, required: true },
  issueDate: { type: Date, default: Date.now },
  completionScore: { type: Number, default: 100 }, // Percentage or mark
  university: { type: String, default: "" },
  studentRoll: { type: String, default: "" },
  marksGrade: { type: String, default: "" },
  syllabusDescription: { type: String, default: "" },
  verificationUrl: { type: String, required: true },
  qrCodeDataUrl: { type: String, default: "" },
  status: { type: String, default: "Valid" }, // Valid / Revoked
  issuedBy: { type: String, default: "BJS & Bar Aspirants Academy" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Certificate", CertificateSchema);
