const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const uploadController = require("../controllers/uploadController");

/* =========================================================
   UPLOAD ROUTES
========================================================= */

// GET /api/upload/signature - Get Cloudinary upload signature
router.get("/signature", auth, uploadController.getSignature);

module.exports = router;
