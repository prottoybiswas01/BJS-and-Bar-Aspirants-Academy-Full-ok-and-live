const mongoose = require("mongoose");

const StudyNoteSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  category: { type: String, required: true, index: true }, // e.g. "দেওয়ানী কার্যবিধি (CPC)", "দণ্ডবিধি (Penal Code)", "ফৌজদারি কার্যবিধি (CrPC)", "বাংলাদেশ সংবিধান", "BJS সিলেবাস ও প্রস্তুতি"
  summary: { type: String, default: "" },
  content: { type: String, required: true },
  lawSections: [{ type: String }], // e.g. ["CPC Section 9", "Order 39 Rule 1"]
  readTime: { type: String, default: "5 min" },
  order: { type: Number, default: 0 },
  isPublished: { type: Boolean, default: true, index: true },
  views: { type: Number, default: 0 },
  
  // Video Clip & Class Integration
  courseId: { type: String, default: "" },
  courseTitle: { type: String, default: "" },
  lessonId: { type: String, default: "" },
  lessonTitle: { type: String, default: "" },
  youtubeId: { type: String, default: "" },
  clipStartSeconds: { type: Number, default: 0 },
  clipEndSeconds: { type: Number, default: 0 },
  clipDuration: { type: Number, default: 0 },

  // SEO & Discoverability
  seoTitle: { type: String, default: "" },
  seoDescription: { type: String, default: "" },
  seoKeywords: [{ type: String }],
  keyProvisions: [{ type: String }],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("StudyNote", StudyNoteSchema);
