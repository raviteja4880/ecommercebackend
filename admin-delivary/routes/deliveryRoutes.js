const express = require("express");
const router = express.Router();
const Order = require("../../models/Order");
const { auth, deliveryOnly } = require("../../middleware/authMiddleware");
const { sendDeliveryEmail } = require("../../utils/sendEmail");

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
    const order = await Order.findById(req.params.id).populate("user", "name email");
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.assignedTo?.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "You are not assigned to this order" });
    }

    // Prevent duplicate updates
    if (order.isDelivered) {
      return res.status(400).json({ message: "Order already delivered" });
    }

    // Update delivery status
    order.isDelivered = true;
    order.deliveredAt = Date.now();
    order.status = "Delivered";

    res.json({
    message: "Order delivered",
    deliveredAt: order.deliveredAt
  });

    // If COD, mark as paid on delivery
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

    // Send email notification to customer (Brevo)
    if (order.user?.email) {
      try {
        await sendDeliveryEmail(order.user.email, updatedOrder);
        console.log(` Delivery email sent to ${order.user.email}`);
      } catch (emailError) {
        console.error("❌ Failed to send delivery email:", emailError.message);
      }
    }

    res.json({
      success: true,
      message:
        order.paymentMethod === "COD"
          ? "Order delivered, COD collected, and email sent to customer."
          : "Order delivered and confirmation email sent to customer.",
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
router.put("/:id/mark-paid", auth, deliveryOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.assignedTo?.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "This order is not assigned to you" });
    }

    if (order.paymentMethod !== "COD") {
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
      method: "COD",
      update_time: new Date().toISOString(),
      confirmedBy: req.user.name || "Delivery Partner",
    };

    const updatedOrder = await order.save();

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
