const axios = require("axios");

const ML_BASE_URL = process.env.ML_SERVICE_URL;

const getHomeRecommendations = async (seed, limit = 4) => {
  const { data } = await axios.get(
    `${ML_BASE_URL}/recommend/home`,
    { params: { seed, limit } }
  );
  return data.recommendations;
};

const getProductRecommendations = async (externalId) => {
  const { data } = await axios.get(
    `${ML_BASE_URL}/recommend/product/${externalId}`
  );
  return data;
};

const getCartRecommendations = async (cartExternalIds) => {
  const { data } = await axios.post(
    `${ML_BASE_URL}/recommend/cart`,
    { cartItems: cartExternalIds }
  );
  return data.recommendations;
};

module.exports = {
  getHomeRecommendations,
  getProductRecommendations,
  getCartRecommendations
};
