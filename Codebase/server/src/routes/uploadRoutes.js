const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const { createLimiter } = require("../middleware/security");
const uploadIntentService = require("../services/uploadIntentService");
const response = require("../utils/responses");
const logger = require("../utils/logger");

const router = express.Router();

// Returns a signed URL the browser uploads to directly; see uploadIntentService.
router.post("/uploads", authenticateToken, createLimiter, async (req, res) => {
  try {
    const { purpose, mimeType, size, conversationId } = req.body || {};
    const intent = await uploadIntentService.createUploadIntent({ userId: req.user.id, purpose, mimeType, size, conversationId });
    return response.created(res, intent);
  } catch (error) {
    if (error?.isPublic) return response.failure(res, error.statusCode || 400, error.message);
    logger.error("createUploadIntent failed", error);
    return response.serverError(res, "Could not prepare the upload", error.message);
  }
});

module.exports = router;
