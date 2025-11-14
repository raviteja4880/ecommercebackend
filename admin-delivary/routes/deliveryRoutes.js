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

    // If COD, mark as paid
    if (order.paymentMethod === "COD" && !order.isPaid) {
      order.isPaid = true;
      order.paidAt = Date.now();
      order.paymentResult = {
        status: "paid",
        method: "COD",
        update_time: new Date().toISOString(),
        confirmedBy: req.user.name,
      };
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
