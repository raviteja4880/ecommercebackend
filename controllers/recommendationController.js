const Product = require("../models/Product");
const { getProductRecommendations, getCartRecommendations } = require("../services/mlService");

// ================= PRODUCT PAGE RECOMMENDATIONS =================
const productRecommendations = async (req, res) => {
  try {
    const { externalId } = req.params;
    if (!externalId) return res.json([]);

    const mlResults = await getProductRecommendations(externalId);
    if (!Array.isArray(mlResults) || !mlResults.length) return res.json([]);

    const productIds = mlResults
      .map(p => p.externalId)
      .filter(id => typeof id === "string" && id.length);

    const products = await Product.find(
      { externalId: { $in: productIds } },
      { __v: 0 }
    ).lean();

    if (!products.length) return res.json([]);

    const map = new Map(products.map(p => [p.externalId, p]));
    const ordered = productIds.map(id => map.get(id)).filter(Boolean);

    return res.json(ordered);
  } catch (err) {
    console.error("Product recommendation error:", err.message);
    return res.status(500).json([]);
  }
};

// ================= CART PAGE RECOMMENDATIONS =================
const cartRecommendations = async (req, res) => {
  try {
    const { cartItems } = req.body;
    if (!Array.isArray(cartItems) || !cartItems.length) return res.json([]);

    // ----------  TRY ML FIRST ----------
    try {
      const mlResults = await getCartRecommendations(cartItems);

      if (Array.isArray(mlResults) && mlResults.length) {
        const productIds = mlResults.map(p => p.externalId);

        const products = await Product.find(
          { externalId: { $in: productIds } },
          { __v: 0 }
        ).lean();

        if (products.length) {
          const map = new Map(products.map(p => [p.externalId, p]));
          const ordered = productIds.map(id => map.get(id)).filter(Boolean);

          if (ordered.length) return res.json(ordered);
        }
      }
    } catch (mlErr) {
      console.warn("⚠️ ML cart recommendation failed:", mlErr.message);
    }

    // ----------  FALLBACK (MULTI-CATEGORY) ----------
    const cartProducts = await Product.find(
      { externalId: { $in: cartItems } },
      { category: 1 }
    ).lean();

    if (!cartProducts.length) return res.json([]);

    // Count category frequency
    const categoryCount = {};
    cartProducts.forEach(p => {
      categoryCount[p.category] =
        (categoryCount[p.category] || 0) + 1;
    });

    // Sort categories by importance
    const sortedCategories = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .map(([cat]) => cat);

    // Fetch diverse fallback products
    const fallbackProducts = await Product.find(
      {
        category: { $in: sortedCategories },
        externalId: { $nin: cartItems }
      },
      { __v: 0 }
    )
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    return res.json(fallbackProducts);

  } catch (err) {
    console.error("Cart recommendation error:", err.message);
    return res.status(500).json([]);
  }
};

module.exports = { productRecommendations,cartRecommendations };
