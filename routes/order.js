const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const Order = require("../models/Order");
const Product = require("../models/Product");
const {
  sendOrderCancelledEmail,
  sendDeliveryEmail,
  sendOrderConfirmationEmail
} = require("../utils/email/sendEmail");

// ---------------- DELIVERY STAGE AUTO UPDATE ----------------
async function computeAndSyncStages(order) {
  if (!order) return order;

  if (order.isCanceled) {
    order.deliveryStage = 0;
    order.delayMessage = false;
    await order.save().catch(() => {});
    return order;
  }

  const now = new Date();
  const created = new Date(order.createdAt || now);
  const daysPassed = Math.floor((now - created) / (1000 * 60 * 60 * 24)) + 1;

  let desiredStage = 1;
  if (order.isDelivered) desiredStage = 4;
  else if (daysPassed >= 3) desiredStage = 3;
  else if (daysPassed === 2) desiredStage = 2;

  let updated = false;

  if (!order.isDelivered && order.deliveryStage < desiredStage) {
    order.deliveryStage = desiredStage;
    updated = true;
  }

  if (order.expectedDeliveryDate && now > new Date(order.expectedDeliveryDate)) {
    order.delayMessage = true;
    updated = true;
  }

  if (updated) await order.save().catch(() => {});
  return order;
}

// CREATE ORDER
router.post("/", auth, async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, mobile } = req.body;

    // ---------------- VALIDATIONS ----------------
    if (!items?.length) {
      return res.status(400).json({ message: "No order items" });
    }

    if (!shippingAddress?.trim()) {
      return res.status(400).json({ message: "Shipping address required" });
    }

    if (!mobile || !/^[6-9]\d{9}$/.test(mobile)) {
      return res.status(400).json({ message: "Invalid mobile number" });
    }

    const detailedItems = [];
    let itemsPrice = 0;
    const rollbackBuffer = [];

    // ---------------- ATOMIC STOCK DEDUCTION ----------------
    for (let item of items) {
      if (!item.product || !item.qty || item.qty <= 0) {
        return res.status(400).json({ message: "Invalid item payload" });
      }

      const product = await Product.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(item.product),
          countInStock: { $gte: item.qty },
        },
        { $inc: { countInStock: -item.qty } },
        { new: true }
      );

      // If update fails → rollback previous deductions
      if (!product) {
        for (let rollback of rollbackBuffer) {
          await Product.findByIdAndUpdate(rollback.productId, {
            $inc: { countInStock: rollback.qty },
          });
        }

        const failed = await Product.findById(item.product);

        return res.status(400).json({
          message: failed
            ? `${failed.name} has only ${failed.countInStock} left`
            : "Product unavailable or removed",
        });
      }

      rollbackBuffer.push({ productId: product._id, qty: item.qty });

      detailedItems.push({
        name: product.name,
        image: product.image,
        price: product.price,
        qty: item.qty,
        product: product._id,
      });

      itemsPrice += product.price * item.qty;
    }

    // ---------------- PRICE CALCULATION ----------------
    const shippingPrice = itemsPrice < 500 ? 29 : 0;
    const totalPrice = itemsPrice + shippingPrice;

    const expectedDelivery = new Date();
    expectedDelivery.setDate(expectedDelivery.getDate() + 5);

    // ---------------- CREATE ORDER ----------------
    const order = new Order({
      user: req.user._id,
      items: detailedItems,
      shippingAddress,
      mobile,
      paymentMethod,
      itemsPrice,
      shippingPrice,
      totalPrice,
      deliveryStage: 1,
      expectedDeliveryDate: expectedDelivery,
      isPaid: false,
      isDelivered: false,
      isCanceled: false,
    });

    const createdOrder = await order.save();

    // ---------------- EMAIL (FAIL SAFE) ----------------
    try {
      await sendOrderConfirmationEmail(req.user.email, createdOrder);
    } catch (_) {
      // silently ignore email failure
    }

    return res.status(201).json(createdOrder);

  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
});

// CANCEL ORDER 
router.put("/:id/cancel", auth, async (req, res) => {
  try {
    const { reason } = req.body;

    const order = await Order.findById(req.params.id)
      .populate("user", "email name");

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.user._id.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorized" });

    if (order.isDelivered)
      return res.status(400).json({ message: "Delivered orders cannot cancel" });

    if (order.isCanceled)
      return res.status(400).json({ message: "Already cancelled" });

    // RESTORE STOCK
    for (let item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { countInStock: item.qty }
      });
    }

    order.isCanceled = true;
    order.cancelReason = reason || "User cancelled";
    order.canceledAt = Date.now();
    order.status = "Cancelled";
    order.deliveryStage = 0;

    const updatedOrder = await order.save();

    try {
      await sendOrderCancelledEmail(order.user.email, updatedOrder);
    } catch {}

    return res.json({ success: true, order: updatedOrder });

  } catch (error) {
    console.error("❌ CANCEL ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

// GET USER ORDERS
router.get("/my", auth, async (req, res) => {
  try {
    let orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 });

    orders = await Promise.all(orders.map(computeAndSyncStages));
    res.json(orders);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// GET ORDER BY ID
router.get("/:id", auth, async (req, res) => {
  try {
    let order = await Order.findById(req.params.id).populate("user");

    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.user._id.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorized" });

    order = await computeAndSyncStages(order);
    res.json(order);

  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
