const mongoose = require("mongoose");

const MentorSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  photoUrl: { type: String, default: "" },
  designation: { type: String, default: "সহকারী জজ (BJS)" },
  posting: { type: String, default: "ঢাকা" },
  expertise: { type: String, default: "দেওয়ানী ও ফৌজদারী আইন" },
  phone: { type: String, default: "" },
  showPhone: { type: Boolean, default: false },
  status: { type: String, default: "Active" },
  bio: { type: String, default: "" },
  studentsMentored: { type: String, default: "1,500+ Aspirants" },
  judgesProduced: { type: String, default: "45+ Assistant Judges" },
  experienceYears: { type: String, default: "10+ Years" },
  ratingScore: { type: String, default: "4.9 / 5.0" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Mentor", MentorSchema);
