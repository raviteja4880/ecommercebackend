const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ===================== AUTHENTICATION =====================
const auth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token)
      return res.status(401).json({ message: "Not authorized, token missing" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) return res.status(404).json({ message: "User not found" });

    next();
  } catch (error) {
    console.error("Auth Error:", error.message);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

// ===================== ROLE-BASED ACCESS =====================

//  Admin only
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied: Admins only" });
  }
  next();
};

// Super Admin only
const superAdminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "superadmin") {
    return res.status(403).json({ message: "Access denied: Super Admins only" });
  }
  next();
};

// Delivery Partner only
const deliveryOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "delivery") {
    return res
      .status(403)
      .json({ message: "Access denied: Delivery partners only" });
  }
  next();
};

// Admin OR Super Admin
const adminOrSuperAdmin = (req, res, next) => {
  if (!req.user || !["admin", "superadmin"].includes(req.user.role)) {
    return res
      .status(403)
      .json({ message: "Access denied: Admins or Super Admins only" });
  }
  next();
};

module.exports = { auth, adminOnly, deliveryOnly, superAdminOnly, adminOrSuperAdmin };
