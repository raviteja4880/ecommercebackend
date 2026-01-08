const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    otp: { type: String, required: true },

    purpose: {
      type: String,
      enum: ["register", "reset_password"],
      required: true,
    },

    payload: {
      name: String,
      password: String,
      phone: String,
    },

    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Auto delete after expiry
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Only one OTP per email + purpose
otpSchema.index({ email: 1, purpose: 1 }, { unique: true });

module.exports = mongoose.model("Otp", otpSchema);
