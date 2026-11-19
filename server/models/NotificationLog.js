const mongoose = require("mongoose");

const notificationLogSchema = new mongoose.Schema({
  eventId: { type: String, required: true, index: true }, // e.g. pub-les-1234
  lessonId: { type: String, required: true, index: true },
  courseId: { type: String, required: true, index: true },
  recipientEmail: { type: String, required: true, index: true },
  recipientName: { type: String, default: "" },
  status: {
    type: String,
    enum: ["pending", "sent", "failed"],
    default: "pending",
    index: true
  },
  attemptCount: { type: Number, default: 0 },
  sentAt: { type: Date, default: null },
  lastAttemptAt: { type: Date, default: null },
  error: { type: String, default: "" },
  providerMessageId: { type: String, default: "" }
}, { timestamps: true });

// Prevent duplicate notifications to the same recipient for the same lesson
notificationLogSchema.index({ lessonId: 1, recipientEmail: 1 }, { unique: true });

module.exports = mongoose.model("NotificationLog", notificationLogSchema);
