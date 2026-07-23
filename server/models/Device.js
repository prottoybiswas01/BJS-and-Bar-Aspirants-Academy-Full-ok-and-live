const mongoose = require("mongoose");

const deviceSchema = new mongoose.Schema({
  studentId: { type: String, required: true, index: true },
  deviceId: { type: String, required: true },
  platform: { type: String, default: "" },
  browser: { type: String, default: "" },
  ip: { type: String, default: "" },
  lastLogin: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model("Device", deviceSchema);
