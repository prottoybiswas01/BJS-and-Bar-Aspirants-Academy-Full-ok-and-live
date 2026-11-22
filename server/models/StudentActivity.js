const mongoose = require("mongoose");

const studentActivitySchema = new mongoose.Schema({
  studentId: { type: String, required: true, index: true },
  date: { type: String, required: true, index: true }, // Format: YYYY-MM-DD (Asia/Dhaka)
  loginCount: { type: Number, default: 0 },
  totalWatchSeconds: { type: Number, default: 0 },
  lessons: [{
    lessonId: { type: String, required: true },
    courseId: { type: String, default: "" },
    lessonTitle: { type: String, default: "" },
    secondsWatched: { type: Number, default: 0 },
    lastTimestamp: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    updatedAt: { type: Date, default: Date.now }
  }],
  logins: [{
    timestamp: { type: Date, default: Date.now },
    method: { type: String, default: "email/password" },
    ip: { type: String, default: "" }
  }],
  lastActiveAt: { type: Date, default: Date.now }
}, { timestamps: true });

// High-speed compound indexes for 90-day activity queries & range scans
studentActivitySchema.index({ studentId: 1, date: -1 });
studentActivitySchema.index({ date: -1, totalWatchSeconds: -1 });

module.exports = mongoose.model("StudentActivity", studentActivitySchema);
