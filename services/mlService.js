const axios = require("axios");

const ML_BASE_URL = process.env.ML_SERVICE_URL;

const mlClient = axios.create({
  baseURL: ML_BASE_URL,
  timeout: 15000, // increased to 15s (Render cold start)
});

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const pending = new Map();

const safeCall = async (key, fn) => {
  if (pending.has(key)) {
    return pending.get(key);
  }

  const promise = (async () => {
    try {
      return await fn();
    } catch (err) {
      const isTimeout = err.code === "ECONNABORTED";
      const is429 = err.response?.status === 429;

      if (isTimeout || is429) {
        const wait = is429 ? 3500 : 2000;
        console.warn(`[ML-RETRY] ${isTimeout ? 'Timeout' : '429'} — waiting ${wait}ms then retrying...`);
        await delay(wait);
        return await fn();
      }


      console.error(`[ML-ERROR] Request failed: ${err.message}`);
      throw err;
    } finally {
      pending.delete(key);
    }
  })();

  pending.set(key, promise);
  return promise;
};


const getHomeRecommendations = async (seed, limit = 4) => {
  try {
    return await safeCall(`home-${seed}`, async () => {
      const { data } = await mlClient.get("/recommend/home", {
        params: { seed, limit },
      });
      return data.recommendations;
    });
  } catch (err) {
    console.error(`[ML-FALLBACK] Home Recs failed: ${err.message}`);
    return []; // Return empty instead of crashing
  }
};

const getProductRecommendations = async (externalId) => {
  try {
    return await safeCall(`product-${externalId}`, async () => {
      const { data } = await mlClient.get(
        `/recommend/product/${externalId}`
      );
      return data;
    });
  } catch (err) {
    console.error(`[ML-FALLBACK] Product Recs failed: ${err.message}`);
    return []; // Return empty instead of crashing
  }
};

const getCartRecommendations = async (cartExternalIds) => {
  try {
    return await safeCall(`cart-${cartExternalIds.join("-")}`, async () => {
      const { data } = await mlClient.post("/recommend/cart", {
        cartItems: cartExternalIds,
      });
      return data.recommendations;
    });
  } catch (err) {
    console.error(`[ML-FALLBACK] Cart Recs failed: ${err.message}`);
    return []; // Return empty instead of crashing
  }
};


module.exports = {
  getHomeRecommendations,
  getProductRecommendations,
  getCartRecommendations,
};