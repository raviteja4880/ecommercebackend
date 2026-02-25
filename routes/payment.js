const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const { 
  initiatePayment, 
  verifyPayment, 
  confirmPayment 
} = require("../controllers/paymentController");

// ================= PAYMENT ROUTES =================
// @access  Private
router.post("/initiate", auth, initiatePayment);

// @access  Private
router.post("/verify/:orderId", auth, verifyPayment);

// @access  Private
router.post("/confirm/:orderId", auth, confirmPayment);

module.exports = router;
