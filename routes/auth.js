const express = require("express");
const router = express.Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { auth } = require("../middleware/authMiddleware");

// ================= REGISTER =================
router.post("/register", async (req, res) => {
  const { name, email, password, phone, role } = req.body;

  try {
    // Check if user already exists
    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "User already exists" });

    // Restrict multiple admins
    if (role === "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });
      if (adminCount > 0) {
        return res.status(403).json({
          message: "Super admin already exists. Cannot create another admin.",
        });
      }
    }

    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: role || "user",
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "24d",
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      token,
    });
  } catch (error) {
    console.error("Register Error:", error.message);
    res.status(500).json({ message: "Server error during registration" });
  }
});

// ================= LOGIN =================
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "24d",
    });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      token,
    });
  } catch (error) {
    console.error("Login Error:", error.message);
    res.status(500).json({ message: "Server error during login" });
  }
});

// ================= PROFILE =================
router.get("/profile", auth, async (req, res) => {
  try {
    res.json(req.user);
  } catch (error) {
    console.error("Profile Error:", error.message);
    res.status(500).json({ message: "Unable to fetch profile" });
  }
});

// ================= UPDATE PROFILE =================
router.put("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) return res.status(404).json({ message: "User not found" });

    // Allow only these fields to be updated
    const { name, phone, password } = req.body;

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (password) user.password = password;

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      phone: updatedUser.phone,
      email: updatedUser.email,
      role: updatedUser.role,
      token: jwt.sign({ id: updatedUser._id }, process.env.JWT_SECRET, {
        expiresIn: "24d",
      }),
    });
  } catch (error) {
    console.error("Update Profile Error:", error.message);
    res.status(500).json({ message: "Server error during update" });
  }
});

// ================= ADMIN: UPDATE ANY USER =================
router.put("/:id", auth, async (req, res) => {
  try {
    // Allow only admin to update others
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied: Admins only" });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { name, phone, role } = req.body;

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (role) user.role = role;

    const updated = await user.save();
    res.json({
      message: "User updated successfully",
      user: {
        _id: updated._id,
        name: updated.name,
        phone: updated.phone,
        email: updated.email,
        role: updated.role,
      },
    });
  } catch (error) {
    console.error("Admin Update Error:", error.message);
    res.status(500).json({ message: "Failed to update user" });
  }
});

module.exports = router;
