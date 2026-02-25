const Cart = require("../models/Cart");
const Product = require("../models/Product");

const calculateTotal = (items) =>
  items.reduce((sum, item) => {
    const price = item.product?.price || 0;
    return sum + price * item.qty;
  }, 0);

const sendCartResponse = async (cart, res) => {
  if (!cart) return res.json({ items: [], totalPrice: 0 });

  const populatedCart = await Cart.findById(cart._id).populate("items.product");
  const totalPrice = calculateTotal(populatedCart.items);

  res.json({
    items: populatedCart.items,
    totalPrice,
  });
};

// ================= Get Cart =================
exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate(
      "items.product"
    );
    if (!cart) return res.json({ items: [], totalPrice: 0 });

    const totalPrice = calculateTotal(cart.items);
    res.json({ items: cart.items, totalPrice });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= Add Item =================
exports.addItem = async (req, res) => {
  try {
    const { productId, qty = 1 } = req.body;

    if (!Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ message: "Quantity must be positive" });
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [{ product: productId, qty }] });
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
    const populatedCart = await Cart.findById(cart._id).populate("items.product");

    const totalPrice = calculateTotal(populatedCart.items);

    res.json({
      items: populatedCart.items,
      totalPrice,
    });
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

    if (!Number.isInteger(qty)) {
      return res.status(400).json({ message: "Quantity must be a number" });
    }

    let cart = await Cart.findOne({ user: req.user._id });
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
    return sendCartResponse(cart, res);
  } catch (error) {
    console.error("Cart Update Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= Remove Item =================
exports.removeItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter((x) => {
      const storedId =
        typeof x.product === "object"
          ? x.product._id?.toString()
          : x.product.toString();
      return storedId !== productId;
    });

    await cart.save();
    return sendCartResponse(cart, res);
  } catch (error) {
    console.error("Cart Remove Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= Clear Cart =================
exports.clearCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
      cart.items = [];
      await cart.save();
    }
    return res.json({ items: [], totalPrice: 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
