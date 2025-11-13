const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { sendDeliveryEmail, sendOrderConfirmationEmail } = require("../utils/sendEmail");

// ================== CREATE ORDER ==================
router.post("/", auth, async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, mobile } = req.body;

    if (!items || items.length === 0)
      return res.status(400).json({ message: "No order items" });

    if (!shippingAddress?.trim())
      return res.status(400).json({ message: "Shipping address is required" });

    if (!mobile?.trim())
      return res.status(400).json({ message: "Mobile number is required" });

    if (!/^[6-9]\d{9}$/.test(mobile))
      return res.status(400).json({ message: "Invalid mobile number format" });

    // Fetch actual product data
    const detailedItems = await Promise.all(
      items.map(async (i) => {
        const product = await Product.findById(i.product);
        if (!product) throw new Error(`Product not found: ${i.product}`);

        return {
          name: product.name,
          image: product.image,
          price: product.price,
          qty: i.qty,
          product: product._id,
        };
      })
    );

    // Calculate prices
    const itemsPrice = detailedItems.reduce(
      (acc, item) => acc + item.price * item.qty,
      0
    );

    const shippingPrice = itemsPrice < 500 ? 29 : 0;
    const totalPrice = itemsPrice + shippingPrice;

    // Expected delivery date (+5 days)
    const expectedDelivery = new Date();
    expectedDelivery.setDate(expectedDelivery.getDate() + 5);

    const order = new Order({
      user: req.user._id,
      items: detailedItems,
      shippingAddress,
      mobile,
      paymentMethod,
      itemsPrice,
      shippingPrice,
      totalPrice,
      isPaid: false,

      // new fields
      deliveryStage: 1,
      expectedDeliveryDate: expectedDelivery,
      delayMessage: false,
    });

    const createdOrder = await order.save();

    // Send Order Confirmation Email with LIVE TRACKING LINK
    await sendOrderConfirmationEmail(req.user.email, createdOrder);

    res.status(201).json(createdOrder);
  } catch (error) {
    console.error("Create Order Error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
});


// ================== MARK AS PAID ==================
router.put("/:id/pay", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order)
      return res.status(404).json({ message: "Order not found" });

    if (order.isPaid)
      return res.status(400).json({ message: "Order already marked as paid" });

    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      transactionId: req.body.transactionId || `TXN-${Date.now()}`,
      status: req.body.status || "paid",
      update_time: new Date().toISOString(),
      method: req.body.method || order.paymentMethod,
      email: req.user.email,
    };

    const updatedOrder = await order.save();
    res.json({ message: "Order marked as paid", order: updatedOrder });
  } catch (error) {
    console.error("Pay Order Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});


// ================== GET MY ORDERS ==================
router.get("/my", auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error("My Orders Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});


// ================== GET ORDER BY ID (AUTO-DELAY CHECK) ==================
router.get("/:id", auth, async (req, res) => {
  try {
    let order = await Order.findById(req.params.id).populate(
      "user",
      "name email phone"
    );

    if (!order)
      return res.status(404).json({ message: "Order not found" });

    if (order.user._id.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorized" });

    let updated = false;

    // =========== AUTO DELAY CHECK ===========
    const now = new Date();

    if (!order.isDelivered && order.expectedDeliveryDate && now > order.expectedDeliveryDate) {
      order.delayMessage = true;

      if (order.deliveryStage < 4) {
        order.deliveryStage = 3;
      }

      updated = true;
      await order.save();
    }

    // Auto fix totals
    const freshTotal = order.items.reduce(
      (acc, i) => acc + (i.price || 0) * i.qty,
      0
    );
    const expectedTotal = freshTotal + (freshTotal < 500 ? 29 : 0);

    if (expectedTotal !== order.totalPrice) {
      order.totalPrice = expectedTotal;
      updated = true;
      await order.save();
    }

    // RELOAD the updated object so FE gets newest deliveryStage
    if (updated) {
      order = await Order.findById(req.params.id).populate(
        "user",
        "name email phone"
      );
    }

    res.json(order);

  } catch (error) {
    console.error("Get Order Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ================== MARK AS DELIVERED ==================
router.put("/:id/deliver", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("user", "name email");

    if (!order)
      return res.status(404).json({ message: "Order not found" });

    if (order.isDelivered)
      return res.status(400).json({ message: "Order already delivered" });

    order.isDelivered = true;
    order.deliveredAt = Date.now();
    order.status = "Delivered";
    order.deliveryStage = 4;  // FINAL STAGE
    order.delayMessage = false;

    const updatedOrder = await order.save();

    if (order.user?.email) {
      await sendDeliveryEmail(order.user.email, updatedOrder);
    }

    res.json({
      message: "Order marked as delivered & email sent",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Deliver Order Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
