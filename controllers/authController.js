const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Otp = require("../models/Otp");
const cloudinary = require("../utils/cloudinary");

const {
  sendVerifyOtpEmail,
  resendVerifyOtpEmail,
  sendResetPasswordOtpEmail,
  sendWelcomeEmail,
} = require("../utils/email/sendEmail");

/* ================= UTILS ================= */
const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "24d" });

const OTP_EXPIRY = 5 * 60 * 1000; // 5 minutes

/* =========================================================
   REGISTER
========================================================= */
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const otp = generateOTP();

    // Find existing OTP instead of deleting blindly
    const existingOtp = await Otp.findOne({
      email,
      purpose: "register",
    });

    if (existingOtp) {
      existingOtp.otp = otp;
      existingOtp.expiresAt = Date.now() + OTP_EXPIRY;
      existingOtp.payload = { name, password, phone };
      await existingOtp.save();
    } else {
      await Otp.create({
        email,
        otp,
        purpose: "register",
        expiresAt: Date.now() + OTP_EXPIRY,
        payload: { name, password, phone },
      });
    }

    await sendVerifyOtpEmail(email, { name, otp });

    res.json({
      message: "OTP sent (valid for 10 minutes)",
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    res.status(500).json({ message: "Registration failed" });
  }
};

/* =========================================================
   VERIFY OTP
========================================================= */
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        message: "Email and OTP are required",
      });
    }

    const record = await Otp.findOne({ email });

    if (!record) {
      return res.status(400).json({
        message: "OTP not found. Please request a new one.",
      });
    }

    if (record.expiresAt < Date.now()) {
      await Otp.deleteOne({ _id: record._id });
      return res.status(400).json({
        message: "OTP expired. Please request a new one.",
      });
    }

    if (record.otp !== String(otp)) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    if (record.purpose === "register") {
      if (!record.payload) {
        await Otp.deleteOne({ _id: record._id });
        return res.status(400).json({
          message: "Registration expired. Please register again.",
        });
      }

      const { name, password, phone } = record.payload;

      const user = await User.create({
        name,
        email,
        password,
        phone,
        isEmailVerified: true,
        status: "active",
      });

      await sendWelcomeEmail(email, { name });

      await Otp.deleteOne({ _id: record._id });

      return res.json({
        token: generateToken(user._id),
        user,
      });
    }

    if (record.purpose === "reset_password") {
      return res.json({
        message: "OTP verified for password reset",
      });
    }

    return res.status(400).json({
      message: "Invalid OTP purpose",
    });
  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================================================
   RESEND OTP
========================================================= */
exports.resendOtp = async (req, res) => {
  const { email, purpose } = req.body;

  if (!email || !purpose) {
    return res.status(400).json({
      message: "Email and purpose are required",
    });
  }

  const record = await Otp.findOne({ email, purpose });

  if (!record) {
    return res.status(404).json({
      message: "OTP expired or invalid purpose. Please start again.",
    });
  }

  record.otp = generateOTP();
  record.expiresAt = Date.now() + OTP_EXPIRY;
  await record.save();

  if (purpose === "register") {
    await resendVerifyOtpEmail(email, { otp: record.otp });
  } else if (purpose === "reset_password") {
    await sendResetPasswordOtpEmail(email, { otp: record.otp });
  }

  res.json({ message: "OTP resent (valid for 2 minutes)" });
};

/* =========================================================
   LOGIN
========================================================= */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.status !== "active") {
      return res.status(403).json({ message: "Account is blocked" });
    }

    res.status(200).json({
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================================================
   FORGOT PASSWORD
========================================================= */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Remove old OTP
    await Otp.deleteOne({ email, purpose: "reset_password" });

    const otp = generateOTP();

    // OTP IS SAVED HERE
    const savedOtp = await Otp.create({
      email,
      otp,
      purpose: "reset_password",
      expiresAt: Date.now() + OTP_EXPIRY,
    });

    // Email must NEVER block logic
    try {
      await sendResetPasswordOtpEmail(email, {
        name: user.name,
        otp,
      });
    } catch (mailErr) {
      console.error("RESET PASSWORD EMAIL FAILED:", mailErr.message);
    }

    res.json({
      message: "OTP generated for password reset",
    });
  } catch (err) {
    console.error("FORGOT PASSWORD ERROR:", err);
    res.status(500).json({ message: "Forgot password failed" });
  }
};

/* =========================================================
   RESET PASSWORD
========================================================= */
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const record = await Otp.findOne({
      email,
      purpose: "reset_password",
    });

    if (!record) {
      return res.status(400).json({ message: "OTP not found" });
    }

    if (record.expiresAt < Date.now()) {
      await Otp.deleteOne({ _id: record._id });
      return res.status(400).json({ message: "OTP expired" });
    }

    if (record.otp !== String(otp)) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.password = newPassword;
    await user.save();

    await Otp.deleteMany({ email, purpose: "reset_password" });

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    res.status(500).json({ message: "Reset password failed" });
  }
};

/* =========================================================
   GET PROFILE
========================================================= */
exports.getProfile = async (req, res) => {
  const user = req.user;

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar?.url || null,
    role: user.role,
  });
};

/* =========================================================
   GET MINI PROFILE
========================================================= */
exports.getMiniProfile = async (req, res) => {
  res.json({
    name: req.user.name,
    avatar: req.user.avatar?.url || null,
  });
};

/* =========================================================
   UPDATE PROFILE
========================================================= */
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { name, phone, password, currentPassword, avatarUrl, avatarPublicId } = req.body;

    if (name) user.name = name;
    if (phone) user.phone = phone;

    if (password) {
      if (!currentPassword) {
        return res.status(400).json({
          message: "Current password is required",
        });
      }

      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({
          message: "Current password is incorrect",
        });
      }

      user.password = password;
    }

    // ---------- AVATAR ----------
    if (avatarUrl === null && avatarPublicId === null) {
      if (user.avatar?.publicId) {
        await cloudinary.uploader.destroy(user.avatar.publicId);
      }
      user.avatar = null;
    }

    if (avatarUrl && avatarPublicId) {
      if (user.avatar?.publicId) {
        await cloudinary.uploader.destroy(user.avatar.publicId);
      }
      user.avatar = {
        url: avatarUrl,
        publicId: avatarPublicId,
      };
    }

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar?.url || null,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ message: "Profile update failed" });
  }
};
