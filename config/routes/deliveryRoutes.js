const express = require("express");
const router = express.Router();
const Order = require("../../models/Order");
const Payment = require("../../models/Payments");
const { auth, deliveryOnly } = require("../../middleware/authMiddleware");
const { sendDeliveryEmail, sendVerifyOtpEmail, resendVerifyOtpEmail } = require("../../utils/email/sendEmail");
const User = require("../../models/User");
const jwt = require("jsonwebtoken");
const redisClient = require("../../config/redis");

// ================== UTILITY FUNCTIONS ==================
const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "24d" });

const OTP_EXPIRY = 5 * 60 * 1000; // 5 minutes

// delivery registration
router.post("/register-delivery", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      // If already delivery/admin/superadmin → block
      if (["delivery", "admin", "superadmin"].includes(existingUser.role)) {
        return res.status(400).json({
          message: "This email is already registered for a privileged role",
        });
      }
    }

    const otp = generateOTP();
    const otpKey = `otp:delivery_register:${email}`;

    // Store in Redis with 5-minute TTL (300 seconds)
    const otpData = {
      otp,
      purpose: "delivery_register",
      payload: { name, password, phone },
    };

    await redisClient.set(otpKey, JSON.stringify(otpData), { EX: 300 });

    await sendVerifyOtpEmail(email, { name, otp });

    res.json({
      message: "OTP sent for delivery registration",
    });
  } catch (err) {
    console.error("DELIVERY REGISTER ERROR:", err);
    res.status(500).json({ message: "Delivery registration failed" });
  }
});

// ================== VERIFY DELIVERY OTP & COMPLETE REGISTRATION ==================
router.post("/verify-delivery-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        message: "Email and OTP are required",
      });
    }

    const otpKey = `otp:delivery_register:${email}`;
    const cachedData = await redisClient.get(otpKey);

    if (!cachedData) {
      return res.status(400).json({
        message: "OTP not found or expired. Please register again.",
      });
    }

    const record = JSON.parse(cachedData);

    if (record.otp !== String(otp)) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    if (!record.payload) {
      await redisClient.del(otpKey);
      return res.status(400).json({
        message: "Registration expired. Please register again.",
      });
    }

    const { name, password, phone } = record.payload;

    let user = await User.findOne({ email });

    if (user) {
      // Upgrade existing user to delivery
      user.role = "delivery";
      user.phone = phone || user.phone;
      user.isEmailVerified = true;
      user.status = "active";

      if (password) {
        user.password = password;
      }

      await user.save();
    } else {
      // Create new delivery user
      user = await User.create({
        name,
        email,
        password,
        phone,
        role: "delivery",
        isEmailVerified: true,
        status: "active",
      });
    }

    // Clean up OTP from Redis
    await redisClient.del(otpKey);

    return res.json({
      token: generateToken(user._id),
      user,
    });

  } catch (err) {
    console.error("VERIFY DELIVERY OTP ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ================== RESEND DELIVERY OTP ==================
router.post("/resend-delivery-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const otpKey = `otp:delivery_register:${email}`;
    const cachedData = await redisClient.get(otpKey);

    if (!cachedData) {
      return res.status(404).json({
        message: "OTP expired. Please register again.",
      });
    }

    const record = JSON.parse(cachedData);
    const newOtp = generateOTP();
    record.otp = newOtp;

    // Refresh TTL (5 minutes)
    await redisClient.set(otpKey, JSON.stringify(record), { EX: 300 });

    try {
      await resendVerifyOtpEmail(email, {
        name: "Delivery Partner",
        otp: newOtp,
      });
    } catch (mailErr) {
      console.error("DELIVERY RESEND EMAIL FAILED:", mailErr.message);
    }

    return res.json({ message: "Delivery OTP resent" });

  } catch (err) {
    console.error("RESEND DELIVERY OTP ERROR:", err);
    return res.status(500).json({ message: "Failed to resend OTP" });
  }
});

// ================== GET ASSIGNED ORDERS ==================
router.get("/my-orders", auth, deliveryOnly, async (req, res) => {
  try {
    const orders = await Order.find({ assignedTo: req.user._id, isCanceled: false })

      .populate("user", "name email phone")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error("Fetch Delivery Orders Error:", error.message);
    res.status(500).json({
      message: "Failed to fetch delivery orders",
      error: error.message,
    });
  }
});

// ================== MARK AS DELIVERED ==================
router.put("/:id/deliver", auth, deliveryOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email phone")
      .populate("assignedTo", "name email");

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.assignedTo?._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You are not assigned to this order" });
    }

    if (order.isDelivered) {
      return res.status(400).json({ message: "Order already delivered" });
    }

    // Mark delivered
    order.isDelivered = true;
    order.deliveredAt = Date.now();
    order.status = "Delivered";

    // If COD, mark as paid (handle both uppercase and lowercase)
    const paymentMethodLower = order.paymentMethod?.toLowerCase();
    if (paymentMethodLower === "cod" && !order.isPaid) {
      order.isPaid = true;
      order.paidAt = Date.now();
      order.paymentResult = {
        status: "paid",
        method: "cod",
        update_time: new Date().toISOString(),
        confirmedBy: req.user.name,
      };

      // Also update Payment collection if exists
      await Payment.findOneAndUpdate(
        { order: order._id, active: true },
        {
          status: 'paid',
          transactionId: 'COD-' + Date.now()
        }
      );
    }

    const updatedOrder = await order.save();

    // SAVE TO DeliveredOrder SCHEMA
    const DeliveredOrder = require("../../models/DeliveredOrder");

    await DeliveredOrder.create({
      originalOrderId: order._id,

      user: {
        _id: order.user._id,
        name: order.user.name,
        email: order.user.email,
        phone: order.user.phone,
      },

      items: order.items.map((i) => ({
        name: i.name,
        qty: i.qty,
        price: i.price,
        image: i.image,
      })),

      shippingAddress: order.shippingAddress,
      mobile: order.mobile,
      paymentMethod: order.paymentMethod,

      totalPrice: order.totalPrice,
      itemsPrice: order.itemsPrice,
      shippingPrice: order.shippingPrice,

      deliveredAt: order.deliveredAt,

      assignedTo: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
      },

      paymentResult: order.paymentResult,
      deliveryStage: order.deliveryStage,
    });

    // Send Delivered Email
    if (order.user?.email) {
      try {
        await sendDeliveryEmail(order.user.email, updatedOrder);
      } catch (err) {
        console.error("Email send failed:", err.message);
      }
    }

    res.json({
      success: true,
      message: "Order delivered and saved to Delivered Orders.",
      order: updatedOrder,
    });

  } catch (error) {
    console.error("Delivery Error:", error.message);
    res.status(500).json({ message: "Delivery update failed" });
  }
});

// ================== MARK COD PAYMENT AS PAID ==================
router.put("/:id/mark-paid", auth, deliveryOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.assignedTo?.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "This order is not assigned to you" });
    }

    // Check for COD (case insensitive)
    const paymentMethodLower = order.paymentMethod?.toLowerCase();
    if (paymentMethodLower !== "cod") {
      return res
        .status(400)
        .json({ message: "Only COD payments can be confirmed manually" });
    }

    if (order.isPaid) {
      return res.status(400).json({ message: "Order already marked as paid" });
    }

    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      status: "paid",
      method: "cod",
      update_time: new Date().toISOString(),
      confirmedBy: req.user.name || "Delivery Partner",
    };

    const updatedOrder = await order.save();

    // Also update Payment collection if exists
    await Payment.findOneAndUpdate(
      { order: order._id, active: true },
      {
        status: 'paid',
        transactionId: 'COD-' + Date.now()
      }
    );

    res.json({
      success: true,
      message: "COD payment confirmed successfully.",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("COD Payment Confirm Error:", error.message);
    res.status(500).json({
      message: "Failed to confirm COD payment",
      error: error.message,
    });
  }
});

module.exports = router;
