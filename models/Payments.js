const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    method: { type: String, enum: ["qr", "card"], required: true },
    status: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
    transactionId: { type: String },
    qrCodeUrl: { type: String },
    cardLast4: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
