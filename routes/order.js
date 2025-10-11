const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const Order = require("../models/Order");

// @desc   Create new order
// @route  POST /api/orders
// @access Private
router.post("/", auth, async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No order items" });
    }

    const itemsPrice = items.reduce((acc, item) => {
      const price = item.price || (item.product && item.product.price) || 0;
      const qty = item.qty || 1;
      return acc + price * qty;
    }, 0);

    const shippingPrice = itemsPrice > 100 ? 0 : 10;
    const taxPrice = Number((0.18 * itemsPrice).toFixed(2));
    const totalPrice = Number((itemsPrice + shippingPrice + taxPrice).toFixed(2));

    const isPaid = paymentMethod === "COD"; // ✅ COD is considered paid
    const paidAt = isPaid ? Date.now() : null;

    const order = new Order({
      user: req.user._id,
      items,
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
    res.status(500).json({ message: "Server error" });
  }
});

// @desc   Get logged-in user's orders
// @route  GET /api/orders/my
// @access Private
// @route  GET /api/orders/my
router.get("/my", auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate("items.product", "name image price"); // populate product info
    res.json(orders);
  } catch (error) {
    console.error("My Orders Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @desc   Get single order by ID
// @route  GET /api/orders/:id
// @access Private
router.get("/:id", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("user", "name email");

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    res.json(order);
  } catch (error) {
    console.error("Get Order Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @desc   Update order to paid
// @route  PUT /api/orders/:id/pay
// @access Private
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

// @desc   Update order to delivered (Admin)
// @route  PUT /api/orders/:id/deliver
// @access Private/Admin
router.put("/:id/deliver", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: "Order not found" });

    // ⚠️ Add admin check here
    // if (!req.user.isAdmin) return res.status(403).json({ message: "Not authorized" });

    order.isDelivered = true;
    order.deliveredAt = Date.now();

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (error) {
    console.error("Deliver Order Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
