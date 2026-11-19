const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  adminId: { type: String, default: "ADMIN-001", index: true },
  adminName: { type: String, default: "Super Admin" },
  action: {
    type: String,
    required: true,
    enum: [
      "STUDENT_DELETE",
      "STUDENT_SAVE",
      "STUDENT_APPROVE",
      "PAYMENT_APPROVE",
      "COURSE_SAVE",
      "COURSE_DELETE",
      "LESSON_SAVE",
      "LESSON_DELETE",
      "MAIL_SETTINGS_UPDATE",
      "DEMO_DATA_CLEAR"
    ],
    index: true
  },
  targetType: { type: String, default: "student", index: true },
  targetId: { type: String, default: "", index: true },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  ip: { type: String, default: "" },
  userAgent: { type: String, default: "" },
  timestamp: { type: Date, default: Date.now, index: true }
}, {
  timestamps: true
});

// TTL auto-cleanup after 90 days (7,776,000 seconds) to conserve MongoDB 512MB free storage
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 86400 });
auditLogSchema.index({ action: 1, timestamp: -1 });

module.exports = mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);
