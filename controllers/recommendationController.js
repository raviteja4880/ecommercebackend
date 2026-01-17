const Product = require("../models/Product");
const {
  getProductRecommendations,
  getCartRecommendations
} = require("../services/mlService");

// PRODUCT PAGE RECOMMENDATIONS
const productRecommendations = async (req, res) => {
  try {
    const { externalId } = req.params;

    if (!externalId) return res.json([]);

    // Call ML service
    const mlResults = await getProductRecommendations(externalId);

    if (!Array.isArray(mlResults) || mlResults.length === 0) {
      return res.json([]);
    }

    // Preserve ML ranking order
    const productIds = mlResults.map(p => p.externalId);

    // Fetch products from Mongo
    const products = await Product.find(
      { externalId: { $in: productIds } },
      { __v: 0 }
    ).lean();

    if (!products.length) return res.json([]);

    //  Reorder products based on ML score order
    const productMap = new Map(
      products.map(p => [p.externalId, p])
    );

    const orderedProducts = productIds
      .map(id => productMap.get(id))
      .filter(Boolean);

    return res.json(orderedProducts);

  } catch (err) {
    console.error("Product recommendation error:", err.message);
    return res.status(500).json([]);
  }
};


// CART PAGE RECOMMENDATIONS
const cartRecommendations = async (req, res) => {
  try {
    const { cartItems } = req.body;

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return res.json([]);
    }

    // Try ML recommendations first
    const mlResults = await getCartRecommendations(cartItems);

    if (Array.isArray(mlResults) && mlResults.length > 0) {
      const productIds = mlResults.map(p => p.externalId);

      const products = await Product.find(
        { externalId: { $in: productIds } },
        { __v: 0 }
      ).lean();

      if (products.length) {
        const productMap = new Map(
          products.map(p => [p.externalId, p])
        );

        const orderedProducts = productIds
          .map(id => productMap.get(id))
          .filter(Boolean);

        if (orderedProducts.length) {
          return res.json(orderedProducts);
        }
      }
    }

    // Fetch cart products
    const cartProducts = await Product.find(
      { externalId: { $in: cartItems } },
      { category: 1 }
    ).lean();

    if (!cartProducts.length) return res.json([]);

    // Dominant category
    const dominantCategory = cartProducts[0].category;

    // Category-based fallback
    const fallbackProducts = await Product.find(
      {
        category: dominantCategory,
        externalId: { $nin: cartItems }
      },
      { __v: 0 }
    )
      .sort({ createdAt: -1 })
      .limit(4)
      .lean();

    return res.json(fallbackProducts);

  } catch (err) {
    console.error("Cart recommendation error:", err.message);
    return res.status(500).json([]);
  }
};

module.exports = {
  productRecommendations,
  cartRecommendations
};
