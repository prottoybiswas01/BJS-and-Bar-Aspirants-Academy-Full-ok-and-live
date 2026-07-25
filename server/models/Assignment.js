const mongoose = require("mongoose");

const AssignmentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  courseId: { type: String, required: true },
  mentorId: { type: String, required: true },
  mentorName: { type: String, default: "Mentor" },
  totalMarks: { type: Number, default: 100 },
  dueDate: { type: String, default: "" },
  status: { type: String, enum: ["Active", "Closed"], default: "Active" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Assignment", AssignmentSchema);
