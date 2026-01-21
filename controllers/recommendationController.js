import Product from "../models/Product.js";
import {
  getProductRecommendations,
  getCartRecommendations,
  getHomeRecommendations
} from "../services/mlService.js";

const safeArray = (val) => (Array.isArray(val) ? val : []);

const normalizeExternalIds = (items) =>
  items
    .map(p => (typeof p === "string" ? p : p?.externalId))
    .filter(Boolean);

/* ============================================================
   HOME PAGE RECOMMENDATIONS
============================================================ */

const homeRecommendations = async (req, res) => {
  const userKey = req.query.userKey || "guest";
  const today = new Date().toISOString().slice(0, 10);
  const seed = `${userKey}-${today}`;

  try {
    let mlResults = [];

    try {
      mlResults = safeArray(await getHomeRecommendations(seed, 4));
    } catch (err) {
      console.warn("[HOME-ML] Failed:", err.message);
    }

    if (!mlResults.length) return res.json([]);

    const productIds = normalizeExternalIds(mlResults);
    if (!productIds.length) return res.json([]);

    const products = await Product.find(
      { externalId: { $in: productIds } },
      { __v: 0 }
    ).lean();

    if (!products.length) return res.json([]);

    const productMap = new Map(products.map(p => [p.externalId, p]));
    const ordered = productIds.map(id => productMap.get(id)).filter(Boolean);

    return res.json(ordered);
  } catch (err) {
    console.error("[HOME] Error:", err);
    return res.json([]);
  }
};

/* ============================================================
   PRODUCT PAGE RECOMMENDATIONS
============================================================ */

const productRecommendations = async (req, res) => {
  const { externalId } = req.params;
  if (!externalId) return res.json([]);

  try {
    let mlResults = [];

    try {
      mlResults = safeArray(await getProductRecommendations(externalId));
    } catch (err) {
      console.warn("[PRODUCT-ML] Failed:", err.message);
    }

    if (!mlResults.length) return res.json([]);

    const productIds = normalizeExternalIds(mlResults);
    if (!productIds.length) return res.json([]);

    const products = await Product.find(
      { externalId: { $in: productIds } },
      { __v: 0 }
    ).lean();

    if (!products.length) return res.json([]);

    const productMap = new Map(products.map(p => [p.externalId, p]));
    const ordered = productIds.map(id => productMap.get(id)).filter(Boolean);

    return res.json(ordered);
  } catch (err) {
    console.error("[PRODUCT] Error:", err);
    return res.json([]);
  }
};

/* ============================================================
   CART PAGE RECOMMENDATIONS
============================================================ */

const cartRecommendations = async (req, res) => {
  const cartItems = safeArray(req.body?.cartItems);
  if (!cartItems.length) return res.json([]);

  try {
    /* ---------- TRY ML FIRST ---------- */
    try {
      const mlResults = safeArray(await getCartRecommendations(cartItems));
      const productIds = normalizeExternalIds(mlResults);

      if (productIds.length) {
        const products = await Product.find(
          { externalId: { $in: productIds } },
          { __v: 0 }
        ).lean();

        if (products.length) {
          const productMap = new Map(products.map(p => [p.externalId, p]));
          const ordered = productIds.map(id => productMap.get(id)).filter(Boolean);
          if (ordered.length) return res.json(ordered);
        }
      }
    } catch (err) {
      console.warn("[CART-ML] Failed:", err.message);
    }

    /* ---------- FALLBACK ---------- */
    const cartProducts = await Product.find(
      { externalId: { $in: cartItems } },
      { category: 1 }
    ).lean();

    if (!cartProducts.length) return res.json([]);

    const categoryCount = cartProducts.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    }, {});

    const sortedCategories = Object.keys(categoryCount).sort(
      (a, b) => categoryCount[b] - categoryCount[a]
    );

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
    console.error("[CART] Error:", err);
    return res.json([]);
  }
};

export { productRecommendations, cartRecommendations, homeRecommendations };
