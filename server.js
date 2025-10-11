const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cron = require("node-cron");
const cors = require("cors");

const productRoutes = require("./routes/productRoutes");
const { syncProducts } = require("./services/syncService");
const authRoutes = require("./routes/auth");
const cartRoutes = require("./routes/cart");
const paymentRoutes = require("./routes/payment");
const orderRoutes = require("./routes/order");

dotenv.config();
const app = express();

app.use(express.json());

// CORS setup using environment variable for frontend
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const allowedOrigins = [FRONTEND_URL];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn("❌ CORS blocked request from:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

// Optional: log each request for debugging
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.url}`);
  next();
});

// Routes
app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/orders", orderRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Cron job (runs daily at midnight)
cron.schedule("0 0 * * *", async () => {
  console.log("🌙 Running daily product sync...");
  await syncProducts();
});

// 404 Fallback
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));


