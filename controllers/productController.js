const mongoose = require("mongoose");
const Product = require("../models/Product");
const { syncProducts } = require("../services/syncService");

// GET all products
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET single product by ID
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    let product = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      product = await Product.findById(id);
    }

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (err) {
    console.error("Error fetching product:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Sync products from external source
exports.syncProducts = async (req, res) => {
  try {
    await syncProducts();
    res.json({ message: "Products synced successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
