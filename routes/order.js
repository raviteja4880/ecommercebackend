  const express = require("express");
  const router = express.Router();
  const { auth } = require("../middleware/authMiddleware");
  const Order = require("../models/Order");
  const Product = require("../models/Product");
  const { sendOrderCancelledEmail, sendDeliveryEmail, sendOrderConfirmationEmail } = require("../utils/sendEmail");

  // Function to auto-compute and sync order stages
  async function computeAndSyncStages(order) {
    if (!order) return order;

    // Cancelled order — freeze all progress
    if (order.isCanceled) {
      order.deliveryStage = 0;
      order.delayMessage = false;
      try {
        await order.save();
      } catch (err) {
        console.error("Error saving cancelled order in computeAndSyncStages:", err);
      }
      return order;
    }

    const now = new Date();
    const created = new Date(order.createdAt || order._id.getTimestamp?.() || now);
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysPassed = Math.floor((now - created) / msPerDay) + 1;

    let desiredStage = 1;
    if (order.isDelivered) desiredStage = 4;
    else if (daysPassed >= 3) desiredStage = 3;
    else if (daysPassed === 2) desiredStage = 2;

    let updated = false;

    if (!order.isDelivered && (order.deliveryStage == null || order.deliveryStage < desiredStage)) {
      order.deliveryStage = desiredStage;
      updated = true;
    }

    if (order.expectedDeliveryDate && !order.isDelivered && now > new Date(order.expectedDeliveryDate)) {
      if (!order.delayMessage) {
        order.delayMessage = true;
        updated = true;
      }
    } else if (order.delayMessage) {
      order.delayMessage = false;
      updated = true;
    }

    if (updated) {
      try {
        await order.save();
      } catch (err) {
        console.error("Error saving order during computeAndSyncStages:", err);
      }
    }

    return order;
  }

  // CREATE ORDER
  router.post("/", auth, async (req, res) => {
    try {
      const { items, shippingAddress, paymentMethod, mobile } = req.body;

      if (!items?.length) return res.status(400).json({ message: "No order items" });
      if (!shippingAddress?.trim()) return res.status(400).json({ message: "Shipping address is required" });
      if (!mobile?.trim()) return res.status(400).json({ message: "Mobile number is required" });
      if (!/^[6-9]\d{9}$/.test(mobile)) return res.status(400).json({ message: "Invalid mobile number format" });

      const detailedItems = await Promise.all(
        items.map(async (i) => {
          const product = await Product.findById(i.product);
          if (!product) throw new Error(`Product not found: ${i.product}`);
          return { name: product.name, image: product.image, price: product.price, qty: i.qty, product: product._id };
        })
      );

      const itemsPrice = detailedItems.reduce((acc, item) => acc + item.price * item.qty, 0);
      const shippingPrice = itemsPrice < 500 ? 29 : 0;
      const totalPrice = itemsPrice + shippingPrice;

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
        deliveryStage: 1,
        expectedDeliveryDate: expectedDelivery,
        delayMessage: false,
        isCanceled: false,
        cancelReason: "",
        canceledAt: null,
      });

      const createdOrder = await order.save();

      // Send confirmation email
      await sendOrderConfirmationEmail(req.user.email, createdOrder);

      res.status(201).json(createdOrder);
    } catch (error) {
      console.error("Create Order Error:", error);
      res.status(500).json({ message: error.message || "Server error" });
    }
  });

router.put("/:id/cancel", auth, async (req, res) => {
  try {
    console.log("🔹 Cancel request for order:", req.params.id);
    console.log("🔹 Body reason:", req.body);
    console.log("🔹 Auth user:", req.user);

    const { reason } = req.body;

    let order = await Order.findById(req.params.id)
      .populate("user", "email name")
      .populate("assignedTo", "email name");

    if (!order) {
      console.log("⚠️ Order not found");
      return res.status(404).json({ message: "Order not found" });
    }

    if (!order.user || !order.user._id) {
      console.log("⚠️ User info missing in order");
      return res.status(400).json({ message: "Invalid order user data" });
    }

    if (order.user._id.toString() !== req.user._id.toString()) {
      console.log("⚠️ Unauthorized cancel attempt");
      return res.status(403).json({ message: "Not authorized" });
    }

    if (order.isDelivered) {
      console.log("⚠️ Delivered order cannot be cancelled");
      return res.status(400).json({ message: "Delivered orders cannot be cancelled" });
    }

    if (order.isCanceled) {
      console.log("⚠️ Already cancelled");
      return res.status(400).json({ message: "Order already cancelled" });
    }

    order.isCanceled = true;
    order.cancelReason = reason || "User requested cancellation";
    order.canceledAt = Date.now();
    order.status = "Cancelled";
    order.deliveryStage = 0;
    order.delayMessage = false;

    const updatedOrder = await order.save();
    console.log("✅ Order cancelled in DB");

    if (order.user?.email) {
      console.log("📧 Sending cancel email to:", order.user.email);
      await sendOrderCancelledEmail(order.user.email, updatedOrder);
    } else {
      console.log("⚠️ No email found on user");
    }

    res.json({
      success: true,
      message: "Order cancelled successfully and notifications sent.",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("❌ Cancel Order Error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
});

  // MARK AS PAID
  router.put("/:id/pay", auth, async (req, res) => {
    try {
      const order = await Order.findById(req.params.id);
      if (!order) return res.status(404).json({ message: "Order not found" });
      if (order.isPaid) return res.status(400).json({ message: "Order already marked as paid" });

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

  // GET MY ORDERS
  router.get("/my", auth, async (req, res) => {
    try {
      let orders = await Order.find({ user: req.user._id, isCanceled: false })
        .select(
          "items totalPrice isPaid isDelivered deliveredAt paymentMethod expectedDeliveryDate deliveryStage delayMessage createdAt shippingAddress mobile isCanceled cancelReason canceledAt"
        )
        .sort({ createdAt: -1 });

      const updatedOrders = await Promise.all(orders.map(async (ord) => await computeAndSyncStages(ord)));
      res.json(updatedOrders);
    } catch (error) {
      console.error("My Orders Error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // GET ORDER BY ID
  router.get("/:id", auth, async (req, res) => {
    try {
      let order = await Order.findById(req.params.id).populate("user", "name email phone");
      if (!order) return res.status(404).json({ message: "Order not found" });
      if (order.user._id.toString() !== req.user._id.toString())
        return res.status(403).json({ message: "Not authorized" });
      order = await computeAndSyncStages(order);
      res.json(order);
    } catch (error) {
      console.error("Get Order Error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // MARK AS DELIVERED
  router.put("/:id/deliver", auth, async (req, res) => {
    try {
      const order = await Order.findById(req.params.id).populate("user", "name email");
      if (!order) return res.status(404).json({ message: "Order not found" });
      if (order.isDelivered) return res.status(400).json({ message: "Order already delivered" });

      order.isDelivered = true;
      order.deliveredAt = Date.now();
      order.status = "Delivered";
      order.deliveryStage = 4;
      order.delayMessage = false;

      const updatedOrder = await order.save();

      if (order.user?.email) {
        await sendDeliveryEmail(order.user.email, updatedOrder);
      }

      res.json({ message: "Order marked as delivered & email sent", order: updatedOrder });
    } catch (error) {
      console.error("Deliver Order Error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  module.exports = router;
