const Product = require("../models/Product");
const {
  getProductRecommendations,
  getCartRecommendations
} = require("../services/mlService");


// PRODUCT PAGE RECOMMENDATIONS
const productRecommendations = async (req, res) => {
  try {
    const { externalId } = req.params;

    // Get current product to know category
    const currentProduct = await Product.findOne({ externalId });
    if (!currentProduct) return res.json([]);

    // Try ML first
    const mlResults = await getProductRecommendations(externalId);

    if (mlResults && mlResults.length > 0) {
      const productIds = mlResults.map(p => p.externalId);

      const products = await Product.find({
        externalId: { $in: productIds }
      });

      const productMap = new Map(
        products.map(p => [p.externalId, p])
      );

      const orderedProducts = productIds
        .map(id => productMap.get(id))
        .filter(Boolean);

      if (orderedProducts.length > 0) {
        return res.json(orderedProducts);
      }
    }

    // FALLBACK: latest products from same category
    const fallbackProducts = await Product.find({
      category: currentProduct.category,
      externalId: { $ne: externalId }
    })
      .sort({ createdAt: -1 })
      .limit(4);

    return res.json(fallbackProducts);

  } catch (err) {
    console.error("Product recommendation error:", err.message);
    res.status(500).json([]);
  }
};


// CART PAGE RECOMMENDATIONS
const cartRecommendations = async (req, res) => {
  try {
    const { cartItems } = req.body;
    if (!cartItems || cartItems.length === 0) return res.json([]);

    // Try ML first
    const mlResults = await getCartRecommendations(cartItems);

    if (mlResults && mlResults.length > 0) {
      const productIds = mlResults.map(p => p.externalId);

      const products = await Product.find({
        externalId: { $in: productIds }
      });

      const productMap = new Map(
        products.map(p => [p.externalId, p])
      );

      const orderedProducts = productIds
        .map(id => productMap.get(id))
        .filter(Boolean);

      if (orderedProducts.length > 0) {
        return res.json(orderedProducts);
      }
    }

    // FALLBACK: category-based popular products
    const cartProducts = await Product.find({
      externalId: { $in: cartItems }
    });

    if (!cartProducts.length) return res.json([]);

    const dominantCategory = cartProducts[0].category;

    const fallbackProducts = await Product.find({
      category: dominantCategory,
      externalId: { $nin: cartItems }
    })
      .sort({ createdAt: -1 })
      .limit(4);

    return res.json(fallbackProducts);

  } catch (err) {
    console.error("Cart recommendation error:", err.message);
    res.status(500).json([]);
  }
};

module.exports = { productRecommendations, cartRecommendations };