const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true }, // e.g. civil-laws-intensive
  title: { type: String, required: true },
  shortTitle: { type: String, default: "" },
  faculty: { type: String, default: "Senior Law Faculty" },
  category: { type: String, default: "Law Course" },
  schedule: { type: String, default: "Regular Class" },
  nextLive: { type: String, default: "" },
  price: { type: String, default: "1000" },
  description: { type: String, default: "" },
  status: { type: String, enum: ["Active", "Inactive", "Hidden"], default: "Active" },
}, { timestamps: true });

module.exports = mongoose.model("Course", courseSchema);
