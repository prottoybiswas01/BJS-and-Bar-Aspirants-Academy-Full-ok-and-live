const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  paymentId: { type: String, required: true, unique: true, index: true },
  studentId: { type: String, required: true, index: true },
  courseId: { type: String, required: true },
  bkashNumber: { type: String, required: true },
  trxId: { type: String, required: true, unique: true },
  amount: { type: String, default: "1000" },
  month: { type: String, default: "2026-07" },
  status: { type: String, enum: ["Pending", "Confirmed", "Rejected"], default: "Pending" },
  note: { type: String, default: "" },
}, { timestamps: true });

module.exports = mongoose.model("Payment", paymentSchema);
