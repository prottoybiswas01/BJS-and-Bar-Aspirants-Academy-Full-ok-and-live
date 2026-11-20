const mongoose = require("mongoose");

const telegramSessionSchema = new mongoose.Schema({
  chatId: { type: String, required: true, unique: true, index: true },
  step: { type: String, default: "idle" },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  updatedAt: { type: Date, default: Date.now, index: { expires: 86400 } }
}, { timestamps: true });

module.exports = mongoose.model("TelegramSession", telegramSessionSchema);
