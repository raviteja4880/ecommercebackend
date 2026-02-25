const cloudinary = require("../utils/cloudinary");

// Get upload signature for client-side uploads
exports.getSignature = async (req, res) => {
  try {
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
  } catch (error) {
    console.error("Upload signature error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
