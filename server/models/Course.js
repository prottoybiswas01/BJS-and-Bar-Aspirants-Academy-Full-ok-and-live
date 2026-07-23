const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true }, // e.g. civil-laws-intensive
  title: { type: String, required: true },
  shortTitle: { type: String, default: "" },
  faculty: { type: String, default: "Shanto Deb Roy Arno" },
  category: { type: String, default: "CIVIL LAW" },
  schedule: { type: String, default: "Wed,Sat" },
  batchRegText: { type: String, default: "Wed,Sat" },
  sessionRegText: { type: String, default: "2026-04-01" },
  nextLive: { type: String, default: "Wed,Sat 8:30 PM" },
  price: { type: String, default: "1000" },
  studentCount: { type: Number, default: 0 },
  weeklyFrequency: { type: String, default: "2 Day" },
  description: { type: String, default: "" },
  status: { type: String, enum: ["Active", "Inactive", "Hidden"], default: "Active" },
}, { timestamps: true });

module.exports = mongoose.model("Course", courseSchema);
