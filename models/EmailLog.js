const mongoose = require("mongoose");

const emailLogSchema = new mongoose.Schema(
  {
    to: { type: String, required: true },
    subject: { type: String, required: true },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },

    status: {
      type: String,
      enum: ["sent", "failed"],
      default: "sent",
    },

    messageId: { type: String },

    error: { type: String },

    meta: { type: Object },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EmailLog", emailLogSchema);
