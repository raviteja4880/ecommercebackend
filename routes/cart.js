const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const cartController = require("../controllers/cartController");

/* =========================================================
   CART ROUTES
========================================================= */

// GET /api/cart - Get user's cart
router.get("/", auth, cartController.getCart);

// POST /api/cart/add - Add item to cart
router.post("/add", auth, cartController.addItem);

// PUT /api/cart/:productId - Update item quantity
router.put("/:productId", auth, cartController.updateQuantity);

// DELETE /api/cart/:productId - Remove item from cart
router.delete("/:productId", auth, cartController.removeItem);

// DELETE /api/cart - Clear cart
router.delete("/", auth, cartController.clearCart);

module.exports = router;
