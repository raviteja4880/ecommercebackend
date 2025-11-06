const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const mongoose = require("mongoose");

// Import Routes
const authRoutes = require("./routes/auth");
const orderRoutes = require("./routes/order");
const cartRoutes = require("./routes/cart");
const paymentRoutes = require("./routes/payment");
const adminRoutes = require("./admin-delivary/routes/adminRoutes");
const deliveryRoutes = require("./admin-delivary/routes/deliveryRoutes");

dotenv.config();

// Database Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
};

connectDB();

const app = express();
app.use(express.json());

// CORS — allow both frontends
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://tejacommerce.netlify.app",
  "https://admin-delivary.netlify.app"
];


app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.get("/", (req, res) => {
  res.send("E-commerce backend API is running");
});

// Use routes
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/delivery", deliveryRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
