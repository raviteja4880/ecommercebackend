const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const Payment = require("../models/Payments");
const Order = require("../models/Order");
const QRCode = require("qrcode");

// ================= Initiate Payment =================
// @route   POST /api/payment/initiate
// @access  Private
router.post("/initiate", auth, async (req, res) => {
  try {
    const { orderId, amount, method, cardDetails } = req.body;

    const order = await Order.findById(orderId).populate("user");
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.totalPrice !== amount) {
      return res.status(400).json({ message: "Amount mismatch with order total" });
    }

    // Start as pending
    let paymentData = {
      order: order._id,
      user: order.user._id,
      amount,
      method,
      status: "pending",
    };

    // QR payment → generate QR code automatically
    if (method === "qr") {
      const upiId = "8885674269@ybl";
      const payeeName = "Ravi Teja";
      const qrString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=Order${orderId}`;
      paymentData.qrCodeUrl = await QRCode.toDataURL(qrString);
    }

    // Card payment → store last 4 digits only (dummy)
    if (method === "card") {
      if (!cardDetails?.number || !cardDetails?.expiry || !cardDetails?.cvv) {
        return res.status(400).json({ message: "Invalid card details" });
      }
      paymentData.cardLast4 = cardDetails.number.slice(-4);
      // Do NOT mark paid yet; will confirm manually
    }

    const payment = new Payment(paymentData);
    await payment.save();

    res.json({
      success: true,
      paymentId: payment._id,
      qrCodeUrl: payment.qrCodeUrl,
      status: payment.status,
      amount: payment.amount,
    });

  } catch (error) {
    console.error("Payment initiate error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ================= Verify Payment =================
// @route   POST /api/payment/verify/:orderId
// @access  Private
router.post("/verify/:orderId", auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const payment = await Payment.findOne({ order: orderId });
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    // Just return current status
    res.json({ success: true, status: payment.status });
  } catch (error) {
    console.error("Payment verify error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ================= Confirm Payment =================
// Simulate external payment success (e.g., user scans QR and pays)
// @route   POST /api/payment/confirm/:orderId
// @access  Private
router.post("/confirm/:orderId", auth, async (req, res) => {
  try {
    const { orderId } = req.params;

    const payment = await Payment.findOne({ order: orderId });
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    if (payment.status === "paid") {
      return res.status(400).json({ message: "Payment already completed" });
    }

    // Mark payment as paid
    payment.status = "paid";
    payment.transactionId = "TXN-" + Date.now();
    await payment.save();

    // Update order
    const order = await Order.findById(orderId);
    order.isPaid = true;
    order.paidAt = Date.now();
    await order.save();

    res.json({ success: true, message: "Payment confirmed", status: payment.status });
  } catch (error) {
    console.error("Payment confirm error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
