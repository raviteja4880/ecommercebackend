const Cart = require("../models/Cart");
const Product = require("../models/Product");
const redisClient = require("../config/redis");

const calculateTotal = (items) =>
  items.reduce((sum, item) => {
    const price = item.product?.price || 0;
    return sum + price * item.qty;
  }, 0);

const sendCartResponse = async (cart, res, userId) => {
  if (!cart) {
    if (userId) await redisClient.del(`cart:${userId}`);
    return res.json({ items: [], totalPrice: 0 });
  }

  const populatedCart = await Cart.findById(cart._id).populate("items.product");
  const totalPrice = calculateTotal(populatedCart.items);
  const result = {
    items: populatedCart.items,
    totalPrice,
  };

  // Cache result if userId provided
  if (userId) {
    await redisClient.set(`cart:${userId}`, JSON.stringify(result), { EX: 86400 });
  }

  res.json(result);
};

// ================= Get Cart =================
exports.getCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const cacheKey = `cart:${userId}`;

    // Check cache
    const cachedCart = await redisClient.get(cacheKey);
    if (cachedCart) {
      return res.json(JSON.parse(cachedCart));
    }

    const cart = await Cart.findOne({ user: userId }).populate("items.product");
    if (!cart) return res.json({ items: [], totalPrice: 0 });

    const totalPrice = calculateTotal(cart.items);
    const result = { items: cart.items, totalPrice };

    // Cache for 24h
    await redisClient.set(cacheKey, JSON.stringify(result), { EX: 86400 });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= Add Item =================
exports.addItem = async (req, res) => {
  try {
    const { productId, qty = 1 } = req.body;
    const userId = req.user._id;

    if (!Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ message: "Quantity must be positive" });
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const existingCart = await Cart.findOne({ user: userId });
    const cart = existingCart || new Cart({ user: userId, items: [] });

    if (!existingCart) {
      cart.items = [{ product: productId, qty }];
    } else {
      const existingItem = cart.items.find(
        (item) => item.product.toString() === productId
      );
      if (existingItem) {
        existingItem.qty += qty;
      } else {
        cart.items.push({ product: productId, qty });
      }
    }

    await cart.save();
    
    // Invalidate and refresh cache
    return sendCartResponse(cart, res, userId);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= Update Quantity =================
exports.updateQuantity = async (req, res) => {
  try {
    const { qty } = req.body;
    const { productId } = req.params;
    const userId = req.user._id;

    if (!Number.isInteger(qty)) {
      return res.status(400).json({ message: "Quantity must be a number" });
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const itemIndex = cart.items.findIndex((x) => {
      const storedId =
        typeof x.product === "object"
          ? x.product._id?.toString()
          : x.product.toString();
      return storedId === productId;
    });

    if (itemIndex === -1) {
      return res.status(404).json({ message: "Product not in cart" });
    }

    if (qty <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].qty = qty;
    }

    await cart.save();
    return sendCartResponse(cart, res, userId);
  } catch (error) {
    console.error("Cart Update Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= Remove Item =================
exports.removeItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user._id;
    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter((x) => {
      const storedId =
        typeof x.product === "object"
          ? x.product._id?.toString()
          : x.product.toString();
      return storedId !== productId;
    });

    await cart.save();
    return sendCartResponse(cart, res, userId);
  } catch (error) {
    console.error("Cart Remove Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= Clear Cart =================
exports.clearCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const cart = await Cart.findOne({ user: userId });
    if (cart) {
      cart.items = [];
      await cart.save();
    }
    
    // Invalidate cache
    await redisClient.del(`cart:${userId}`);
    
    return res.json({ items: [], totalPrice: 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

