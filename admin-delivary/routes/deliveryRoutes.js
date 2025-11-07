const express = require("express");
const router = express.Router();
const Order = require("../../models/Order");
const { auth, deliveryOnly } = require("../../middleware/authMiddleware");

// ================== GET ASSIGNED ORDERS ==================
router.get("/my-orders", auth, deliveryOnly, async (req, res) => {
  try {
    const orders = await Order.find({ assignedTo: req.user._id })
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
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.assignedTo?.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "You are not assigned to this order" });
    }

    order.isDelivered = true;
    order.deliveredAt = Date.now();
    order.status = "Delivered";

    // If COD, auto mark as paid upon delivery
    if (order.paymentMethod === "COD" && !order.isPaid) {
      order.isPaid = true;
      order.paidAt = Date.now();
      order.paymentResult = {
        status: "paid",
        method: "COD",
        update_time: new Date().toISOString(),
        confirmedBy: req.user.name || "Delivery Partner",
      };
    }

    const updatedOrder = await order.save();

    res.json({
      success: true,
      message:
        order.paymentMethod === "COD"
          ? "Order delivered and COD payment collected."
          : "Order delivered successfully.",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Delivery Update Error:", error.message);
    res.status(500).json({
      message: "Delivery update failed",
      error: error.message,
    });
  }
});

// ================== MARK COD PAYMENT AS PAID ==================
// Use this when the delivery partner collects payment before delivery
router.put("/:id/mark-paid", auth, deliveryOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Ensure this delivery partner is assigned
    if (order.assignedTo?.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "This order is not assigned to you" });
    }

    // Only COD unpaid orders can be manually marked as paid
    if (order.paymentMethod !== "COD") {
      return res
        .status(400)
        .json({ message: "Only COD payments can be confirmed manually" });
    }

    if (order.isPaid) {
      return res.status(400).json({ message: "Order already marked as paid" });
    }

    // Mark payment as received
    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      status: "paid",
      method: "COD",
      update_time: new Date().toISOString(),
      confirmedBy: req.user.name || "Delivery Partner",
    };

    const updatedOrder = await order.save();

    res.json({
      success: true,
      message: " COD payment confirmed successfully.",
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
