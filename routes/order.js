const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const Order = require("../models/Order");
const Product = require("../models/Product");

// ================== CREATE ORDER ==================
router.post("/", auth, async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, mobile } = req.body;

    // Validation
    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No order items" });
    }
    if (!shippingAddress?.trim()) {
      return res.status(400).json({ message: "Shipping address is required" });
    }
    if (!mobile?.trim()) {
      return res.status(400).json({ message: "Mobile number is required" });
    }
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return res.status(400).json({ message: "Invalid mobile number format" });
    }

    // ✅ Ensure product integrity (pull latest price)
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

    // ✅ Mark COD orders as immediately paid
    const isPaid = paymentMethod === "COD";
    const paidAt = isPaid ? Date.now() : null;

    const order = new Order({
      user: req.user._id,
      items: detailedItems,
      shippingAddress,
      mobile,
      paymentMethod,
      itemsPrice,
      shippingPrice,
      taxPrice,
      totalPrice,
      isPaid,
      paidAt,
      paymentResult: isPaid
        ? { status: "paid", method: "COD", update_time: new Date().toISOString() }
        : {},
    });

    const createdOrder = await order.save();
    res.status(201).json(createdOrder);
  } catch (error) {
    console.error("Create Order Error:", error.message);
    res.status(500).json({ message: error.message || "Server error" });
  }
});

// ================== GET MY ORDERS ==================
router.get("/my", auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate("items.product", "name image price");
    res.json(orders);
  } catch (error) {
    console.error("My Orders Error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// ================== GET ORDER BY ID ==================
router.get("/:id", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("user", "name email phone");
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to view this order" });
    }

    // Auto-fix total mismatch
    const freshTotal = order.items.reduce((acc, i) => acc + (i.price || 0) * i.qty, 0);
    const expectedTotal = Number((freshTotal + order.shippingPrice + order.taxPrice).toFixed(2));

    if (expectedTotal !== order.totalPrice) {
      order.totalPrice = expectedTotal;
      await order.save();
    }

    res.json(order);
  } catch (error) {
    console.error("Get Order Error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// ================== MARK AS PAID ==================
// ✅ Used for: COD & after QR/Card payment confirmation
router.put("/:id/pay", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.isPaid) {
      return res.status(400).json({ message: "Order already marked as paid" });
    }

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
    console.error("Pay Order Error:", error.message);
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
    order.status = "Delivered";

    const updatedOrder = await order.save();
    res.json({ message: "Order marked as delivered", order: updatedOrder });
  } catch (error) {
    console.error("Deliver Order Error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// ================== VERIFY PAYMENT STATUS ==================
router.get("/:id/verify-payment", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    res.json({
      status: order.isPaid ? "paid" : "pending",
      paymentMethod: order.paymentMethod,
    });
  } catch (error) {
    console.error("Verify Payment Error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
