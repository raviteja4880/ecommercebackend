const mongoose = require("mongoose");
const Product = require("../models/Product");
const redisClient = require("../config/redis");

// GET all products
exports.getAllProducts = async (req, res) => {
  try {
    const cacheKey = "products:all";

    // Check cache
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    const products = await Product.find();

    // Save to main cache (EX: 2 hours)
    await redisClient.set(cacheKey, JSON.stringify(products), { EX: 7200 });

    // Pre-fill individual product caches to make single product visits fast
    // This allows single product pages to hit Redis even on their first visit
    products.forEach((p) => {
      const pid = p._id.toString();
      redisClient.set(`product:${pid}`, JSON.stringify(p), { EX: 7200 });
      if (p.externalId) {
        redisClient.set(`product:${p.externalId}`, JSON.stringify(p), { EX: 7200 });
      }
    });

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET single product by ID or externalId
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `product:${id}`;

    // Check cache
    const cachedProduct = await redisClient.get(cacheKey);
    if (cachedProduct) {
      // console.log(`Serving product ${id} from cache`);
      return res.json(JSON.parse(cachedProduct));
    }

    let product = null;

    // Try finding by MongoDB ObjectId first
    if (mongoose.Types.ObjectId.isValid(id)) {
      product = await Product.findById(id);
    }

    // Fallback: search by externalId if not found or not a valid ObjectId
    if (!product) {
      product = await Product.findOne({ externalId: id });
    }

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Save to cache (EX: 2 hours)
    await redisClient.set(cacheKey, JSON.stringify(product), { EX: 7200 });

    // Also cache by the other identifier to keep them in sync
    const otherId = product._id.toString() === id ? product.externalId : product._id.toString();
    if (otherId) {
      await redisClient.set(`product:${otherId}`, JSON.stringify(product), { EX: 7200 });
    }

    res.json(product);
  } catch (err) {
    console.error("Error fetching product:", err);
    res.status(500).json({ message: "Server error" });
  }
};




