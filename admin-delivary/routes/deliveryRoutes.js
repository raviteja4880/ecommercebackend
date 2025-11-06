const express = require("express");
const router = express.Router();
const Order = require("../../models/Order");
const { auth, deliveryOnly } = require("../../middleware/authMiddleware");

// Get assigned orders for delivery partner
router.get("/my-orders", auth, deliveryOnly, async (req, res) => {
  try {
    const orders = await Order.find({ assignedTo: req.user._id }).populate("user", "name email");
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch orders", error });
  }
});

// Mark assigned order as delivered
router.put("/:id/deliver", auth, deliveryOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Check if this order is assigned to the current delivery partner
    if (order.assignedTo?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "This order isn't assigned to you" });
    }

    order.isDelivered = true;
    order.deliveredAt = Date.now();
    order.status = "Delivered";

    const updated = await order.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Delivery update failed", error });
  }
});

module.exports = router;
