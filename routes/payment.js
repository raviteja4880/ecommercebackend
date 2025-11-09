const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const Payment = require("../models/Payments");
const Order = require("../models/Order");
const QRCode = require("qrcode");

// ================= INITIATE PAYMENT =================
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

    // Base payment data
    let paymentData = {
      order: order._id,
      user: order.user._id,
      amount,
      method,
      status: "pending",
    };

    // 🔹 QR PAYMENT
    if (method === "qr") {
      const upiId = "8885674269@ybl";
      const payeeName = "Ravi Teja";
      const qrString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(
        payeeName
      )}&am=${amount}&cu=INR&tn=Order${orderId}`;
      paymentData.qrCodeUrl = await QRCode.toDataURL(qrString);
    }

    // 🔹 CARD PAYMENT
    if (method === "card") {
      if (
        !cardDetails?.number ||
        !cardDetails?.expiry ||
        !cardDetails?.cvv
      ) {
        return res
          .status(400)
          .json({ message: "Invalid or incomplete card details" });
      }
      paymentData.cardLast4 = cardDetails.number.slice(-4);
      // Not marking paid yet — must confirm manually in /confirm
    }

    // COD PAYMENT — no external transaction
    if (method === "COD") {
      paymentData.status = "cod_pending";
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

// ================= VERIFY PAYMENT =================
// @route   POST /api/payment/verify/:orderId
// @access  Private
router.post("/verify/:orderId", auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const payment = await Payment.findOne({ order: orderId });
    if (!payment)
      return res.status(404).json({ message: "Payment not found" });

    // Optionally, you can simulate a delay or check with a real gateway here
    return res.json({ success: true, status: payment.status });
  } catch (error) {
    console.error("Payment verify error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ================= CONFIRM PAYMENT =================
// @route   POST /api/payment/confirm/:orderId
// @access  Private
router.post("/confirm/:orderId", auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const payment = await Payment.findOne({ order: orderId });
    if (!payment)
      return res.status(404).json({ message: "Payment not found" });

    if (payment.status === "paid") {
      return res
        .status(400)
        .json({ message: "Payment already confirmed as paid" });
    }

    // Only QR and CARD can be confirmed manually
    if (["qr", "card"].includes(payment.method)) {
      payment.status = "paid";
      payment.transactionId = "TXN-" + Date.now();
      await payment.save();

      // Update order as paid
      const order = await Order.findById(orderId);
      if (order) {
        order.isPaid = true;
        order.paidAt = Date.now();
        order.paymentMethod = payment.method;
        order.paymentResult = {
          transactionId: payment.transactionId,
          status: "paid",
          update_time: new Date().toISOString(),
        };
        await order.save();
      }

      return res.json({
        success: true,
        message: "Payment confirmed successfully",
        status: payment.status,
      });
    }

    // COD confirmation (not allowed automatically)
    if (payment.method === "COD") {
      return res.status(400).json({
        message: "COD payments are confirmed only after delivery",
      });
    }
  } catch (error) {
    console.error("Payment confirm error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
