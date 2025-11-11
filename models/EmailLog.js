const mongoose = require("mongoose");

const emailLogSchema = new mongoose.Schema({
  to: String,
  subject: String,
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: false },
  messageId: String,
  status: { type: String, enum: ["sent","failed"], default: "sent" },
  error: String,
  meta: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

module.exports = mongoose.model("EmailLog", emailLogSchema);
