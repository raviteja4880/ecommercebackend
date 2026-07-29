const express = require("express");
const {
  productRecommendations,
  cartRecommendations,
  homeRecommendations
} = require("../controllers/recommendationController");

const router = express.Router();

router.get("/home", homeRecommendations);
router.get("/product/:externalId", productRecommendations);
router.post("/cart", cartRecommendations);

module.exports = router;
