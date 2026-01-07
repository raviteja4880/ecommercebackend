const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const mongoose = require("mongoose");

// Load environment variables
dotenv.config();

// ----------------- Import Routes -----------------
const authRoutes = require("./routes/auth");
const orderRoutes = require("./routes/order");
const productRoutes = require("./routes/product");
const cartRoutes = require("./routes/cart");
const paymentRoutes = require("./routes/payment");
const adminRoutes = require("./admin-delivary/routes/adminRoutes");
const deliveryRoutes = require("./admin-delivary/routes/deliveryRoutes");
const uploadRoutes = require("./routes/upload");

// ----------------- Database Connection -----------------
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

connectDB();

// ----------------- Express App Setup -----------------
const app = express();
app.use(express.json());

// ----------------- CORS Configuration -----------------
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://tejacommerce.netlify.app",
  "https://admin-delivary.netlify.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("❌ Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// ----------------- Root Route -----------------
app.get("/", (req, res) => {
  res.send("E-commerce Backend API is running...");
});

// ----------------- API Routes -----------------
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/upload", uploadRoutes);

// ----------------- Start Server -----------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`)
);
