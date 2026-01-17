import axios from "axios";

const ML_BASE_URL = process.env.ML_SERVICE_URL;

export const getProductRecommendations = async (externalId) => {
  const { data } = await axios.get(
    `${ML_BASE_URL}/recommend/product/${externalId}`
  );
  return data;
};

export const getCartRecommendations = async (cartExternalIds) => {
  const { data } = await axios.post(
    `${ML_BASE_URL}/recommend/cart`,
    cartExternalIds
  );
  return data.recommendations;
};
