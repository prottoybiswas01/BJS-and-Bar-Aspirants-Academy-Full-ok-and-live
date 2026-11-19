const mongoose = require("mongoose");

const PushSubscriptionSchema = new mongoose.Schema({
  endpoint: { type: String, required: true, unique: true, index: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true }
  },
  studentId: { type: String, default: "", index: true },
  courseIds: [{ type: String }],
  userAgent: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now, expires: 180 * 24 * 60 * 60 } // 180 days TTL auto-cleanup
});

module.exports = mongoose.model("PushSubscription", PushSubscriptionSchema);
