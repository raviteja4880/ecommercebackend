const Payment = require("../models/Payments");
const Order = require("../models/Order");
const QRCode = require("qrcode");
const crypto = require("crypto");
const { sendOrderConfirmationEmail } = require("../utils/email/sendEmail");

// ================= INITIATE PAYMENT =================
exports.initiatePayment = async (req, res) => {
  try {
    const { orderId, amount, method, cardDetails } = req.body;

    // Validate orderId format
    if (!orderId || !orderId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid order ID format" });
    }

    const order = await Order.findById(orderId).populate("user");
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.totalPrice !== amount) {
      return res
        .status(400)
        .json({ message: "Amount mismatch with order total" });
    }

    const methodLower = method?.toLowerCase();

    // Validate payment method
    if (!methodLower || !["qr", "card", "cod"].includes(methodLower)) {
      return res.status(400).json({ message: "Invalid payment method" });
    }

    let paymentData = {
      order: order._id,
      user: order.user._id,
      amount,
      method: methodLower,
      status: "pending",
      active: true,
    };

    // QR PAYMENT
    if (methodLower === "qr") {
      try {
        const upiId = "8885674269@ybl";
        const payeeName = "MystorX";
        const qrString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(
          payeeName
        )}&am=${amount}&cu=INR&tn=Order${orderId}`;
        paymentData.qrCodeUrl = await QRCode.toDataURL(qrString);
      } catch (qrError) {
        console.error("QR Code generation error:", qrError);
        return res.status(500).json({ message: "Failed to generate QR code" });
      }
    }

    // CARD PAYMENT
    if (methodLower === "card") {
      if (!cardDetails?.number || !cardDetails?.expiry || !cardDetails?.cvv) {
        return res
          .status(400)
          .json({ message: "Invalid or incomplete card details" });
      }
      paymentData.cardLast4 = cardDetails.number.slice(-4);
    }

    // COD PAYMENT
    if (methodLower === "cod") {
      paymentData.status = "cod_pending";
      
      // For COD orders, immediately confirm order since no upfront payment needed
      const orderToUpdate = await Order.findById(orderId);
      if (orderToUpdate) {
        orderToUpdate.isPaid = false;
        orderToUpdate.paymentMethod = "cod";
        if (orderToUpdate.status === "Pending") {
          orderToUpdate.status = "Processing";
        }
        await orderToUpdate.save();
        
        try {
          const populatedOrder = await Order.findById(orderId).populate("user");
          if (populatedOrder) {
            await sendOrderConfirmationEmail(populatedOrder.user.email, populatedOrder);
          }
        } catch (emailError) {
          console.error("COD email error:", emailError);
        }
      }
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
};

// ================= VERIFY PAYMENT =================
exports.verifyPayment = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Validate orderId format
    if (!orderId || !orderId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid order ID format" });
    }

    const payment = await Payment.findOne({ order: orderId, active: true });
    if (!payment)
      return res.status(404).json({ message: "No active payment found" });

    res.json({ success: true, status: payment.status });
  } catch (error) {
    console.error("Payment verify error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= CONFIRM PAYMENT =================
exports.confirmPayment = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Validate orderId format
    if (!orderId || !orderId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid order ID format" });
    }

    const payment = await Payment.findOne({ order: orderId, active: true });
    if (!payment)
      return res.status(404).json({ message: "Payment not found" });

    // Validate payment method exists
    if (!payment.method) {
      return res.status(400).json({ message: "Invalid payment method" });
    }

    const method = payment.method.toLowerCase();

    // Validate payment is not already in terminal state
    if (payment.status === "paid") {
      return res.status(400).json({ message: "Payment already confirmed" });
    }

    if (payment.status === "failed") {
      return res.status(400).json({ message: "Payment failed, please initiate a new payment" });
    }

    if (payment.status === "cod_pending") {
      return res.status(400).json({ message: "COD payment confirmed after delivery only" });
    }

    if (["qr", "card"].includes(method)) {
      payment.status = "paid";
      // Generate unique transaction ID
      payment.transactionId = "TXN-" + crypto.randomBytes(8).toString("hex").toUpperCase();
      await payment.save();

      // Fetch the order with user info for email
      const order = await Order.findById(orderId).populate("user");
      if (order) {
        order.isPaid = true;
        order.paidAt = new Date();
        order.paymentMethod = method;
        // Keep existing order status as-is or update to "Processing" if it's still "Pending"
        if (order.status === "Pending") {
          order.status = "Processing";
        }
        order.paymentResult = {
          transactionId: payment.transactionId,
          status: "paid",
          update_time: new Date().toISOString(),
        };
        await order.save();

        // Send order confirmation email after payment is confirmed
        try {
          await sendOrderConfirmationEmail(order.user.email, order);
        } catch (emailError) {
          console.error("Order confirmation email error:", emailError);
          // Don't fail the payment if email fails
        }
      }

      return res.json({
        success: true,
        paymentStatus: payment.status,
      });
    }

    // Fallback for unknown methods
    return res.status(400).json({ message: "Invalid payment method" });
  } catch (error) {
    console.error("Payment confirm error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
