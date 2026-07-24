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
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Mentor", MentorSchema);
