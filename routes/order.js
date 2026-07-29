const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const orderController = require("../controllers/orderController");

/* =========================================================
   ORDER ROUTES
========================================================= */

// POST /api/orders - Create new order
router.post("/", auth, orderController.createOrder);

// PUT /api/orders/:id/cancel - Cancel order
router.put("/:id/cancel", auth, orderController.cancelOrder);

// GET /api/orders/my - Get user's orders
router.get("/my", auth, orderController.getMyOrders);

// GET /api/orders/:id - Get order by ID
router.get("/:id", auth, orderController.getOrderById);

module.exports = router;
