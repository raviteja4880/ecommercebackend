const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");

/* =========================================================
   PRODUCT ROUTES
========================================================= */

// GET /api/products - Get all products
router.get("/", productController.getAllProducts);

// GET /api/products/:id - Get product by ID
router.get("/:id", productController.getProductById);

module.exports = router;
