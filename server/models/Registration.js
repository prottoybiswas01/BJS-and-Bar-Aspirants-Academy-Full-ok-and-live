const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema({
  regId: { type: String, required: true, unique: true, index: true }, // e.g. REG-2026-9041
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, index: true },
  email: { type: String, required: true, index: true },
  university: { type: String, default: "" },
  batch: { type: String, required: true },
  session: { type: String, default: "" },
  password: { type: String, required: true },
  status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
  reviewNote: { type: String, default: "" },
}, { timestamps: true });

module.exports = mongoose.model("Registration", registrationSchema);
