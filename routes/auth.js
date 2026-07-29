const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const authController = require("../controllers/authController");

/* =========================================================
   AUTH ROUTES
========================================================= */

// POST /api/auth/register
router.post("/register", authController.register);

// POST /api/auth/verify-otp
router.post("/verify-otp", authController.verifyOtp);

// POST /api/auth/resend-otp
router.post("/resend-otp", authController.resendOtp);

// POST /api/auth/login
router.post("/login", authController.login);

// POST /api/auth/forgot-password
router.post("/forgot-password", authController.forgotPassword);

// POST /api/auth/reset-password
router.post("/reset-password", authController.resetPassword);

// GET /api/auth/profile
router.get("/profile", auth, authController.getProfile);

// GET /api/auth/me-mini
router.get("/me-mini", auth, authController.getMiniProfile);

// PUT /api/auth/profile
router.put("/profile", auth, authController.updateProfile);

module.exports = router;
