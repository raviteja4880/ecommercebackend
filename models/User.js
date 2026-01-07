const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: { type: String, required: true },

    phone: { type: String },

    avatar: {
      url: String,
      publicId: String,
    },

    role: {
      type: String,
      enum: ["user", "admin", "superadmin", "delivery"],
      default: "user",
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "inactive",
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

/* PASSWORD HASH */
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = function (password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("User", userSchema);
