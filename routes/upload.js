const express = require("express");
const router = express.Router();
const cloudinary = require("../utils/cloudinary");
const { auth } = require("../middleware/authMiddleware");


router.get("/signature", auth, (req, res) => {
  const timestamp = Math.round(Date.now() / 1000);

  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      folder: "avatars",
    },
    process.env.CLOUDINARY_API_SECRET
  );

  res.json({
    signature,
    timestamp,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    folder: "avatars",
  });
});

module.exports = router;
