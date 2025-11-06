const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const Order = require("../models/Order");
const Product = require("../models/Product");

// ================== CREATE ORDER ==================
router.post("/", auth, async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No order items" });
    }

    // Recalculate prices based on latest Product prices
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

    const itemsPrice = detailedItems.reduce(
      (acc, item) => acc + item.price * item.qty,
      0
    );
    const shippingPrice = itemsPrice > 100 ? 0 : 10;
    const taxPrice = Number((0.18 * itemsPrice).toFixed(2));
    const totalPrice = Number((itemsPrice + shippingPrice + taxPrice).toFixed(2));

    const isPaid = paymentMethod === "COD";
    const paidAt = isPaid ? Date.now() : null;

    const order = new Order({
      user: req.user._id,
      items: detailedItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      shippingPrice,
      taxPrice,
      totalPrice,
      isPaid,
      paidAt,
    });

    const createdOrder = await order.save();
    res.status(201).json(createdOrder);
  } catch (error) {
    console.error("Create Order Error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
});

// ================== GET MY ORDERS ==================
router.get("/my", auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error("My Orders Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ================== GET ORDER BY ID ==================
router.get("/:id", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("user", "name email");
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // ✅ Recalculate total to ensure accuracy
    const freshTotal = order.items.reduce(
      (acc, i) => acc + (i.price || 0) * i.qty,
      0
    );
    const expectedTotal = Number((freshTotal + order.shippingPrice + order.taxPrice).toFixed(2));

    if (expectedTotal !== order.totalPrice) {
      order.totalPrice = expectedTotal;
      await order.save();
    }

    res.json(order);
  } catch (error) {
    console.error("Get Order Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ================== MARK AS PAID ==================
router.put("/:id/pay", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      transactionId: req.body.transactionId,
      status: req.body.status,
      update_time: req.body.update_time,
      email: req.body.email,
    };

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (error) {
    console.error("Pay Order Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ================== MARK AS DELIVERED ==================
router.put("/:id/deliver", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.isDelivered = true;
    order.deliveredAt = Date.now();
    const updatedOrder = await order.save();

    res.json(updatedOrder);
  } catch (error) {
    console.error("Deliver Order Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ================== VERIFY PAYMENT STATUS ==================
router.get("/:id/verify-payment", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // 🔹 Mock verification logic
    // (Replace this with your real payment gateway status check if needed)
    if (order.isPaid) {
      return res.json({
        status: "paid",
        paymentMethod: order.paymentMethod,
      });
    } else {
      return res.json({
        status: "pending",
        paymentMethod: order.paymentMethod,
      });
    }
  } catch (error) {
    console.error("Verify Payment Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
