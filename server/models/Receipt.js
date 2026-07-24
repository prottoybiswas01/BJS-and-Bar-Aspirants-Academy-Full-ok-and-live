const mongoose = require("mongoose");

const receiptSchema = new mongoose.Schema({
  receiptId: { type: String, required: true, unique: true, index: true }, // e.g. REC-2026-1049
  studentId: { type: String, required: true, index: true },
  studentName: { type: String, required: true },
  studentPhone: { type: String, required: true },
  studentEmail: { type: String, required: true },
  batch: { type: String, default: "BJS & Bar Masterclass" },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, required: true, default: "bKash" }, // bKash, Nagad, Rocket, Upay, Bank Transfer, Cash, Others
  trxId: { type: String, default: "N/A" },
  paymentTime: { type: Date, default: Date.now },
  note: { type: String, default: "Course Fee Payment" },
  issuedBy: { type: String, default: "Super Admin" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Receipt", receiptSchema);
