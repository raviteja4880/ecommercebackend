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
    res.status(500).json({ message: "Failed to fetch orders", error: error.message });
  }
});

// ================== MARK AS DELIVERED ==================
router.put("/:id/deliver", auth, deliveryOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Verify assignment
    if (order.assignedTo?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "This order isn't assigned to you" });
    }

    // Update delivery details
    order.isDelivered = true;
    order.deliveredAt = Date.now();
    order.status = "Delivered";

    // Handle COD payment confirmation at delivery
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
      message:
        order.paymentMethod === "COD"
          ? "Order delivered and payment collected (COD)"
          : "Order delivered successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Delivery Update Error:", error.message);
    res.status(500).json({ message: "Delivery update failed", error: error.message });
  }
});

module.exports = router;
