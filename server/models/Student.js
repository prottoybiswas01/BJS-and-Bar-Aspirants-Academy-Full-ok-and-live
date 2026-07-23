const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true }, // e.g. STU-2026-001
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, index: true }, // e.g. 01978167016
  email: { type: String, required: true, unique: true, index: true }, // e.g. prottoy@gmail.com
  batch: { type: String, default: "Judiciary 2026" },
  session: { type: String, default: "Weekend Intensive" },
  password: { type: String, required: true }, // Hashed bcrypt password
  status: { type: String, enum: ["Active", "Inactive", "Blocked"], default: "Active" },
  loginApproval: { type: String, enum: ["Approved", "Pending", "Preview", "Rejected"], default: "Approved" },
  portalAccessMode: { type: String, default: "Full Access" },
  enrolledCourseIds: [{ type: String }],
  allowedCourseIds: [{ type: String }],
  completedLessonIds: [{ type: String }],
  maxDeviceCount: { type: Number, default: 2 },
  highlight: { type: String, default: "" },
  popupMessage: {
    title: { type: String, default: "" },
    body: { type: String, default: "" },
    sentAt: { type: Date },
  },
  joinedOn: { type: String, default: () => new Date().toISOString().split("T")[0] },
}, { timestamps: true });

module.exports = mongoose.model("Student", studentSchema);
