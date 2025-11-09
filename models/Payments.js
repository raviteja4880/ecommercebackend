const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    method: { type: String, enum: ["qr", "card", "cod"], required: true },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "cod_pending"],
      default: "pending",
    },
    transactionId: { type: String },
    qrCodeUrl: { type: String },
    cardLast4: { type: String },
    active: { type: Boolean, default: true }, 
  },
  { timestamps: true }
);

// Before saving, mark older payments for same order as inactive instead of deleting
paymentSchema.pre("save", async function (next) {
  if (this.isNew && this.order) {
    await this.constructor.updateMany(
      { order: this.order, _id: { $ne: this._id } },
      { $set: { active: false } }
    );
  }
  next();
});

module.exports = mongoose.model("Payment", paymentSchema);
