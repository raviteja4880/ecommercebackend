const express = require("express");
const router = express.Router();
const Order = require("../../models/Order");
const User = require("../../models/User");
const Product = require("../../models/Product");
const multer = require("multer");
const axios = require("axios");
const cloudinary = require("../../utils/cloudinary"); 
const {auth, adminOnly, superAdminOnly } = require("../../middleware/authMiddleware");

// Multer setup - store image temporarily
const storage = multer.diskStorage({});
const upload = multer({ storage });

// ================== GET ALL ORDERS (Admin only) ==================
router.get("/orders", auth, adminOnly, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .populate("assignedTo", "name email role")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error("Fetch Orders Error:", error.message);
    res
      .status(500)
      .json({ message: "Server error while fetching orders", error });
  }
});

// ================== UPDATE ORDER STATUS (Admin only) ==================
router.put("/orders/:id/status", auth, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate("user", "name email");

    if (!updatedOrder)
      return res.status(404).json({ message: "Order not found" });

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Update Order Status Error:", error.message);
    res
      .status(500)
      .json({ message: "Failed to update order status", error });
  }
});

// ================== GET ALL PRODUCTS (Admin only) ==================
router.get("/products", auth, adminOnly, async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    console.error("Fetch Products Error:", error.message);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

// ================== ADD NEW PRODUCT (Admin) ==================
router.post("/products", auth, adminOnly, upload.single("image"), async (req, res) => {
  try {
    console.log("Incoming request body:", req.body);
    console.log("Received file:", req.file);

    const { externalId, name, brand, category, description, price, countInStock } = req.body;

    if (!externalId || !name || !price || !category) {
      return res.status(400).json({ message: "Please provide all required fields" });
    }

    let imageUrl = "";
    if (req.file) {
      console.log("Uploading to Cloudinary...");
      const uploadRes = await cloudinary.uploader.upload(req.file.path, {
        folder: "ecommerce_products",
      });
      imageUrl = uploadRes.secure_url;
      console.log("Cloudinary Upload Complete:", imageUrl);
    }

    const newProduct = await Product.create({
      externalId,
      name,
      image: imageUrl,
      brand,
      category,
      description,
      price,
      countInStock: countInStock,
    });

    console.log("Product created successfully:", newProduct);

    res.status(201).json({
      success: true,
      message: "Product added successfully",
      product: newProduct,
    });

  } catch (error) {
    console.error("Add Product Error:", error);
    res.status(500).json({ message: "Failed to add product", error: error.message });
  }
});

// UPDATE PRODUCT (Admin)
router.put("/products/:id", auth, adminOnly, upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;

    const updatedFields = {
      name: req.body.name,
      price: req.body.price,
      category: req.body.category,
      brand: req.body.brand,
      description: req.body.description,
      countInStock: req.body.countInStock,
    };

    if (req.file) {
      const uploadRes = await cloudinary.uploader.upload(req.file.path, {
        folder: "ecommerce_products",
      });
      updatedFields.image = uploadRes.secure_url;
    }

    const updated = await Product.findByIdAndUpdate(id, updatedFields, { new: true });

    res.json({ message: "Inventory updated successfully", product: updated });
  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
});

// DELETE PRODUCT (Admin)
router.delete("/products/:id", auth, adminOnly, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted successfully" });
  } catch {
    res.status(500).json({ message: "Delete failed" });
  }
});

// ================== ASSIGN DELIVERY PARTNER (Admin only) ==================
router.put("/orders/:id/assign", auth, adminOnly, async (req, res) => {
  try {
    const { deliveryPartnerId } = req.body;

    const deliveryUser = await User.findById(deliveryPartnerId);
    if (!deliveryUser || deliveryUser.role !== "delivery") {
      return res.status(400).json({ message: "Invalid delivery partner" });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        assignedTo: deliveryPartnerId,
        status: "Processing",
      },
      { new: true }
    )
      .populate("user", "name email")
      .populate("assignedTo", "name email");

    if (!order)
      return res.status(404).json({ message: "Order not found" });

    res.json({
      success: true,
      message: `Order assigned to ${deliveryUser.name}`,
      order,
    });
  } catch (error) {
    console.error("Assign Delivery Partner Error:", error.message);
    res.status(500).json({ message: "Assignment failed", error });
  }
});

// ================== GET ALL DELIVERY PARTNERS (Admin only) ==================
router.get("/delivery", auth, adminOnly, async (req, res) => {
  try {
    const partners = await User.find({ role: "delivery" }).select(
      "name email phone status"
    );

    res.json(partners);
  } catch (error) {
    console.error("Fetch Delivery Partners Error:", error.message);
    res
      .status(500)
      .json({ message: "Server error while fetching delivery partners", error });
  }
});

// ================== SUPER ADMIN ANALYTICS (read-only) ==================
router.get("/superadmin/analytics", auth, superAdminOnly, async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const deliveredOrders = await Order.countDocuments({ isDelivered: true });
    const cancelledOrders = await Order.countDocuments({ isCanceled: true });
    const totalUsers = await User.countDocuments({ role: "user" });
    const totalAdmins = await User.countDocuments({ role: "admin" });
    const totalDeliveryPartners = await User.countDocuments({ role: "delivery" });

    // Calculate total revenue from paid orders
    const revenueData = await Order.aggregate([
      { $match: { isPaid: true } },
      { $group: { _id: null, totalRevenue: { $sum: "$totalPrice" } } },
    ]);
    const totalRevenue = revenueData[0]?.totalRevenue || 0;

    // Fetch ALL orders (for accurate analytics)
    const allOrders = await Order.find()
      .sort({ createdAt: -1 })
      .populate("user", "name email");

    // Safety: ensure we always have an array
    const safeAllOrders = Array.isArray(allOrders) ? allOrders : [];

    // Keep recent orders optional for UI (first 5)
    const recentOrders = safeAllOrders.slice(0, 5);

    // Respond with explicit keys
    return res.json({
      totalOrders,
      deliveredOrders,
      cancelledOrders,
      totalUsers,
      totalAdmins,
      totalDeliveryPartners,
      totalRevenue,
      recentOrders,   
      allOrders: safeAllOrders, 
    });
  } catch (error) {
    console.error("Analytics Fetch Error:", error);
    return res.status(500).json({ message: "Failed to load analytics data", error: error?.message, stack: error?.stack });
  }
});

// ================== TRIGGER ML RETRAINING (Admin only) ==================
router.post("/ml/retrain", auth, adminOnly, async (req, res) => {
  try {
    const token = req.headers.authorization; 

    await axios.post(
      process.env.ML_RETRAIN_URL,
      {},
      {
        headers: {
          Authorization: token
        }
      }
    );

    res.json({ message: "ML retraining started successfully" });
  } catch (err) {
    console.error("ML retrain error:", err.response?.data || err.message);
    res.status(500).json({ message: "Failed to start retraining" });
  }
});

module.exports = router;
