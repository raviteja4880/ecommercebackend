const express = require("express");
const {
  productRecommendations,
  cartRecommendations
} = require("../controllers/recommendationController");

const router = express.Router();

router.get("/product/:externalId", productRecommendations);
router.post("/cart", cartRecommendations);

module.exports = router;
