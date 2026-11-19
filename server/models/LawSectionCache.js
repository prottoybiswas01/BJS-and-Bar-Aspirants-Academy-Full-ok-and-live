const mongoose = require('mongoose');

const LawSectionCacheSchema = new mongoose.Schema({
  cacheKey: { type: String, required: true, unique: true, index: true },
  queryKeys: [{ type: String, index: true }],
  statuteId: { type: String, required: true, index: true },
  actTitleBn: { type: String, required: true },
  actTitleEn: { type: String, default: '' },
  actNumber: { type: String, default: '' },
  year: { type: Number, default: 0 },
  status: { type: String, default: 'In Force' },
  statusBn: { type: String, default: 'কার্যকর আইন' },
  sourcePortal: { type: String, default: 'bdlaws.minlaw.gov.bd' },
  sourceUrl: { type: String, default: '' },
  sectionNum: { type: String, required: true },
  sectionNumBn: { type: String, default: '' },
  sectionType: { type: String, default: 'ধারা' },
  titleBn: { type: String, default: '' },
  titleEn: { type: String, default: '' },
  excerptBn: { type: String, required: true },
  directUrl: { type: String, default: '' },
  score: { type: Number, default: 10 },
  hash: { type: String, default: '' },
  hitCount: { type: Number, default: 1 },
  fetchedAt: { type: Date, default: Date.now },
  lastAccessedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// High-speed compound index for statute & section querying
LawSectionCacheSchema.index({ statuteId: 1, sectionNum: 1 });

// 60-day TTL Auto-cleanup index to keep legal cache fresh & prevent 512MB storage bloat
LawSectionCacheSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 86400 });

module.exports = mongoose.models.LawSectionCache || mongoose.model('LawSectionCache', LawSectionCacheSchema);
