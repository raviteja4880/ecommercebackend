const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { sendDeliveryEmail, sendOrderConfirmationEmail } = require("../utils/sendEmail");

async function computeAndSyncStages(order) {
  if (!order) return order;

  // If canceled -> freeze progress, ensure fields reflect cancelled state
  if (order.isCanceled) {
    // optional: set a dedicated numeric stage for cancelled (0) so FE can detect and stop progress
    order.deliveryStage = order.deliveryStage || 0;
    order.delayMessage = false;
    try {
      // Only save if some fields needed update
      await order.save();
    } catch (err) {
      console.error("Error saving cancelled order in computeAndSyncStages:", err);
    }
    return order;
  }

  const now = new Date();
  const created = new Date(order.createdAt || order._id.getTimestamp?.() || now);
  const msPerDay = 1000 * 60 * 60 * 24;

  // Days passed since creation (floor difference). day 1 = created day
  const daysPassed = Math.floor((now - created) / msPerDay) + 1;

  // Compute desired stage (cap at 3 unless delivered)
  let desiredStage = 1;
  if (order.isDelivered) {
    desiredStage = 4;
  } else if (daysPassed >= 3) {
    desiredStage = 3;
  } else if (daysPassed === 2) {
    desiredStage = 2;
  } else {
    desiredStage = 1;
  }

  let updated = false;

  // Only update deliveryStage if it's behind the desiredStage (progress forward)
  if (!order.isDelivered && (order.deliveryStage == null || order.deliveryStage < desiredStage)) {
    order.deliveryStage = desiredStage;
    updated = true;
  }

  // Set delayMessage if expectedDeliveryDate passed and not delivered
  if (order.expectedDeliveryDate && !order.isDelivered && now > new Date(order.expectedDeliveryDate)) {
    if (!order.delayMessage) {
      order.delayMessage = true;
      updated = true;
    }
  } else {
    // if it's not overdue, ensure delayMessage is false (optional)
    if (order.delayMessage) {
      order.delayMessage = false;
      updated = true;
    }
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

// ================== CREATE ORDER ==================
router.post("/", auth, async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, mobile } = req.body;

    if (!items || items.length === 0)
      return res.status(400).json({ message: "No order items" });

    if (!shippingAddress?.trim())
      return res.status(400).json({ message: "Shipping address is required" });

    if (!mobile?.trim())
      return res.status(400).json({ message: "Mobile number is required" });

    if (!/^[6-9]\d{9}$/.test(mobile))
      return res.status(400).json({ message: "Invalid mobile number format" });

    // Fetch actual product data
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

    // Calculate prices
    const itemsPrice = detailedItems.reduce(
      (acc, item) => acc + item.price * item.qty,
      0
    );

    const shippingPrice = itemsPrice < 500 ? 29 : 0;
    const totalPrice = itemsPrice + shippingPrice;

    // Expected delivery date (+5 days)
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

      // new fields
      deliveryStage: 1,
      expectedDeliveryDate: expectedDelivery,
      delayMessage: false,
      isCanceled: false,
      cancelReason: "",
      canceledAt: null,
    });

    const createdOrder = await order.save();

    // Send Order Confirmation Email with LIVE TRACKING LINK
    await sendOrderConfirmationEmail(req.user.email, createdOrder);

    res.status(201).json(createdOrder);
  } catch (error) {
    console.error("Create Order Error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
});

// ================== CANCEL ORDER ==================
router.put("/:id/cancel", auth, async (req, res) => {
  try {
    const { reason } = req.body;

    let order = await Order.findById(req.params.id)
      .populate("user", "email name")
      .populate("assignedTo", "email name"); 
    if (!order)
      return res.status(404).json({ message: "Order not found" });

    if (order.user._id.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorized" });

    if (order.isDelivered)
      return res
        .status(400)
        .json({ message: "Delivered orders cannot be cancelled" });

    if (order.isCanceled)
      return res.status(400).json({ message: "Order already cancelled" });

    // Mark cancellation fields
    order.isCanceled = true;
    order.cancelReason = reason || "User requested cancellation";
    order.canceledAt = Date.now();
    order.status = "Cancelled";
    order.deliveryStage = 0;
    order.delayMessage = false;

    const updatedOrder = await order.save();

    // Import email utility
    const {
      sendOrderCancelledEmail,
      sendDeliveryEmail,
    } = require("../../utils/sendEmail");

    // Notify Customer via Email
    if (order.user?.email) {
      try {
        await sendOrderCancelledEmail(order.user.email, updatedOrder);
        console.log(`Cancel email sent to customer: ${order.user.email}`);
      } catch (err) {
        console.error("Failed to send cancellation email:", err.message);
      }
    }

    // Notify Delivery Partner if assigned
    if (order.assignedTo?.email) {
      try {
        await sendDeliveryEmail(
          order.assignedTo.email,
          {
            ...updatedOrder.toObject(),
            items: updatedOrder.items,
            totalPrice: updatedOrder.totalPrice,
          }
        );
        console.log(
          `Cancellation alert sent to delivery partner: ${order.assignedTo.email}`
        );
      } catch (err) {
        console.error(
          "Failed to send cancellation email to delivery partner:",
          err.message
        );
      }
    }

    // Respond to frontend
    res.json({
      success: true,
      message: "Order cancelled successfully and notifications sent.",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Cancel Order Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ================== MARK AS PAID ==================
router.put("/:id/pay", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order)
      return res.status(404).json({ message: "Order not found" });

    if (order.isPaid)
      return res.status(400).json({ message: "Order already marked as paid" });

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

// ================== GET MY ORDERS ==================
router.get("/my", auth, async (req, res) => {
  try {
    let orders = await Order.find({
      user: req.user._id,
      isCanceled: false,     
    })
      .select(
        "items totalPrice isPaid isDelivered deliveredAt paymentMethod expectedDeliveryDate deliveryStage delayMessage createdAt shippingAddress mobile isCanceled cancelReason canceledAt"
      )
      .sort({ createdAt: -1 });

    const updatedOrders = await Promise.all(
      orders.map(async (ord) => {
        return await computeAndSyncStages(ord);
      })
    );

    res.json(updatedOrders);
  } catch (error) {
    console.error("My Orders Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ================== GET ORDER BY ID (AUTO-STAGE SYNC) ==================
router.get("/:id", auth, async (req, res) => {
  try {
    let order = await Order.findById(req.params.id).populate(
      "user",
      "name email phone"
    );

    if (!order)
      return res.status(404).json({ message: "Order not found" });

    if (order.user._id.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorized" });

    // Sync stage/delay status but DO NOT auto-mark delivered
    order = await computeAndSyncStages(order);

    // Auto fix totals (optional but kept)
    const freshTotal = order.items.reduce(
      (acc, i) => acc + (i.price || 0) * i.qty,
      0
    );
    const expectedTotal = freshTotal + (freshTotal < 500 ? 29 : 0);

    if (expectedTotal !== order.totalPrice) {
      order.totalPrice = expectedTotal;
      await order.save();
      // reload
      order = await Order.findById(req.params.id).populate("user", "name email phone");
    }

    res.json(order);
  } catch (error) {
    console.error("Get Order Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ================== MARK AS DELIVERED ==================
router.put("/:id/deliver", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("user", "name email");

    if (!order)
      return res.status(404).json({ message: "Order not found" });

    if (order.isDelivered)
      return res.status(400).json({ message: "Order already delivered" });

    order.isDelivered = true;
    order.deliveredAt = Date.now();
    order.status = "Delivered";
    order.deliveryStage = 4;  // FINAL STAGE
    order.delayMessage = false;

    const updatedOrder = await order.save();

    if (order.user?.email) {
      await sendDeliveryEmail(order.user.email, updatedOrder);
    }

    res.json({
      message: "Order marked as delivered & email sent",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Deliver Order Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
