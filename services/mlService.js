import axios from "axios";

const ML_BASE_URL = process.env.ML_SERVICE_URL;

export const getHomeRecommendations = async (seed, limit = 4) => {
  const { data } = await axios.get(
    `${ML_BASE_URL}/recommend/home`,
    { params: { seed, limit } }
  );
  return data.recommendations;
};

export const getProductRecommendations = async (externalId) => {
  const { data } = await axios.get(
    `${ML_BASE_URL}/recommend/product/${externalId}`
  );
  return data;
};

export const getCartRecommendations = async (cartExternalIds) => {
  const { data } = await axios.post(
    `${ML_BASE_URL}/recommend/cart`,
    { cartItems: cartExternalIds }
  );
  return data.recommendations;
};

