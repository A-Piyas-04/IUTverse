const express = require("express");
const controller = require("../controllers/securityController");
const { authenticateToken } = require("../middleware/auth");
const { requireAdmin, requireRole } = require("../middleware/authorization");
const { createLimiter } = require("../middleware/security");

const router = express.Router();

router.patch("/admin/users/:userId/role", authenticateToken, requireAdmin, createLimiter, controller.updateUserRole);
router.post(
  "/moderation/posts/:postId/identity-disclosures",
  authenticateToken,
  requireRole("admin", "mod"),
  createLimiter,
  controller.disclosePostIdentity
);

module.exports = router;
