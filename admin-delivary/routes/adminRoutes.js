const express = require("express");
const router = express.Router();
const Order = require("../../models/Order");
const User = require("../../models/User");
const { auth } = require("../../middleware/authMiddleware");

// Middleware to ensure admin access
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied: Admins only" });
  }
  next();
};

// Get all orders
router.get("/orders", auth, adminOnly, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .populate("assignedTo", "name email role");
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// Update order status
router.put("/orders/:id/status", auth, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: "Failed to update status" });
  }
});

// Assign delivery partner
router.put("/orders/:id/assign", auth, adminOnly, async (req, res) => {
  try {
    const { deliveryPartnerId } = req.body;

    const deliveryUser = await User.findById(deliveryPartnerId);
    if (!deliveryUser || deliveryUser.role !== "delivery") {
      return res.status(400).json({ message: "Invalid delivery partner" });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { assignedTo: deliveryPartnerId, status: "Processing" },
      { new: true }
    );

    res.json(order);
  } catch (error) {
    console.error("Error assigning delivery partner:", error);
    res.status(500).json({ message: "Assignment failed", error });
  }
});

// Get all delivery partners (from User model)
router.get("/delivery", auth, adminOnly, async (req, res) => {
  try {
    const partners = await User.find({ role: "delivery" }).select("name email phone status");
    res.json(partners);
  } catch (error) {
    console.error("Error fetching delivery partners:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
