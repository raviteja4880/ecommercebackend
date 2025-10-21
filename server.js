console.log("✅ Server.js starting...");

const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cron = require("node-cron");
const cors = require("cors");

console.log("✅ Modules loaded");

const productRoutes = require("./routes/productRoutes");
console.log("✅ productRoutes loaded");

const { syncProducts } = require("./services/syncService");
const authRoutes = require("./routes/auth");
const cartRoutes = require("./routes/cart");
const paymentRoutes = require("./routes/payment");
const orderRoutes = require("./routes/order");

dotenv.config();
const app = express();

app.use(express.json());

// CORS setup
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
app.use(cors({ origin: FRONTEND_URL, credentials: true }));

app.get("/test", (req, res) => res.json({ message: "✅ Test route working" }));

// ROUTES
app.use("/api/products", productRoutes);
console.log("✅ Mounted /api/products");
app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/orders", orderRoutes);
console.log("✅ All routes mounted");

// MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

app.use((req, res) => res.status(404).json({ message: "Route not found" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
