const axios = require("axios");

const ML_BASE_URL = process.env.ML_SERVICE_URL;

const mlClient = axios.create({
  baseURL: ML_BASE_URL,
  timeout: 5000, // prevent hanging
});

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// In-memory request dedupe
const pending = new Map();

// Generic safe ML call wrapper
const safeCall = async (key, fn) => {
  if (pending.has(key)) {
    return pending.get(key);
  }

  const promise = (async () => {
    try {
      return await fn();
    } catch (err) {
      // Retry once if 429
      if (err.response?.status === 429) {
        console.warn("ML 429 — retrying...");
        await delay(1500);
        return await fn();
      }
      throw err;
    } finally {
      pending.delete(key);
    }
  })();

  pending.set(key, promise);
  return promise;
};

const getHomeRecommendations = async (seed, limit = 4) => {
  return safeCall(`home-${seed}`, async () => {
    const { data } = await mlClient.get("/recommend/home", {
      params: { seed, limit },
    });
    return data.recommendations;
  });
};

const getProductRecommendations = async (externalId) => {
  return safeCall(`product-${externalId}`, async () => {
    const { data } = await mlClient.get(
      `/recommend/product/${externalId}`
    );
    return data;
  });
};

const getCartRecommendations = async (cartExternalIds) => {
  return safeCall(`cart-${cartExternalIds.join("-")}`, async () => {
    const { data } = await mlClient.post("/recommend/cart", {
      cartItems: cartExternalIds,
    });
    return data.recommendations;
  });
};

module.exports = {
  getHomeRecommendations,
  getProductRecommendations,
  getCartRecommendations,
};