const mongoose = require("mongoose");

const mailSettingSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: true },
  fallbackEmail: { type: String, default: "bjsacademy38@gmail.com" },
  replyToEmail: { type: String, default: "bjsacademy38@gmail.com" },
  enableAllMails: { type: Boolean, default: true },
  sendAdminCopy: { type: Boolean, default: false },
  loginMails: { type: Boolean, default: true },
  profileUpdateMails: { type: Boolean, default: true },
  courseAccessMails: { type: Boolean, default: true },
  deviceUpdateMails: { type: Boolean, default: true },
  paymentReviewMails: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model("MailSetting", mailSettingSchema);
