const dotenv = require("dotenv");

// 1. Load general defaults from .env
dotenv.config({ path: ".env" });

// 2. Load environment-specific overrides if NODE_ENV is set
const nodeEnv = process.env.NODE_ENV || "development";
const envFile = nodeEnv === "production" ? ".env.production" : ".env.development";
dotenv.config({ path: envFile, override: true });

console.log(`🌍 Environment: [${nodeEnv}] using: ${envFile}`);


const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const redisClient = require("./config/redis");
const limiter = require("./middleware/rateLimiter");
const errorHandler = require("./middleware/errorMiddleware");


// ----------------- Database Connection -----------------
const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;
  
  if (!mongoUri) {
    console.error("❌ Error: MONGO_URI is not defined in any environment file.");
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

connectDB();

// ----------------- Express App Setup -----------------
const app = express();

// Required for Render/Cloud Proxies and Rate Limiting
app.set("trust proxy", 1);


// Security Headers (Basic)
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});

app.use(express.json());

// ----------------- CORS Configuration -----------------
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  process.env.FRONTEND_URL,
  "https://mystorx.netlify.app",
  "https://admin-delivary.netlify.app",
].filter(Boolean);

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

// ----------------- Global Rate Limiting -----------------
app.use("/api", limiter);

// ----------------- Root & Health Route -----------------
app.get("/", (req, res) => {
  res.send("🚀 E-commerce Backend API is running...");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "UP",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});


// ----------------- API Routes -----------------
const authRoutes = require("./routes/auth");
const orderRoutes = require("./routes/order");
const productRoutes = require("./routes/product");
const cartRoutes = require("./routes/cart");
const paymentRoutes = require("./routes/payment");
const adminRoutes = require("./config/routes/adminRoutes");
const deliveryRoutes = require("./config/routes/deliveryRoutes");
const uploadRoutes = require("./routes/upload");
const recommendationRoutes = require("./routes/recommendation");

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/recommendations", recommendationRoutes);

// ----------------- Error Handling -----------------
app.use(errorHandler);

// ----------------- Start Server -----------------
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () =>
  console.log(`Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`)
);

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.error(`Unhandled Rejection: ${err.message}`);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error(`Uncaught Exception: ${err.message}`);
});

