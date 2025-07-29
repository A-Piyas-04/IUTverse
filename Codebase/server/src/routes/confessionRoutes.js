const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const confessionController = require("../controllers/confessionController");
const {
  validateConfessionData,
  validateReactionData,
  validatePollVoteData,
  validatePaginationParams,
  validateIdParam,
  validatePollIdParam,
} = require("../middleware/confessionValidation");

// Public routes - anyone can view confessions
router.get(
  "/confessions",
  validatePaginationParams,
  confessionController.getAllConfessions
);
router.get("/confessions/random", confessionController.getRandomConfession);
router.get("/confessions/analytics", confessionController.getAnalytics);
router.get(
  "/confessions/:id",
  validateIdParam,
  confessionController.getConfessionById
);

// Protected routes - require authentication
router.post(
  "/confessions",
  authenticateToken,
  validateConfessionData,
  confessionController.createConfession
);

// Reaction routes - require authentication
router.post(
  "/confessions/:id/reactions",
  authenticateToken,
  validateIdParam,
  validateReactionData,
  confessionController.addReaction
);
router.delete(
  "/confessions/:id/reactions",
  authenticateToken,
  validateIdParam,
  confessionController.removeReaction
);
router.get(
  "/confessions/:id/user-reactions",
  authenticateToken,
  validateIdParam,
  confessionController.getUserReactions
);

// Poll voting routes - require authentication
router.post(
  "/confessions/:id/polls/:pollId/vote",
  authenticateToken,
  validateIdParam,
  validatePollIdParam,
  validatePollVoteData,
  confessionController.voteOnPoll
);
router.get(
  "/confessions/polls/:pollId/user-voted",
  authenticateToken,
  validatePollIdParam,
  confessionController.checkUserVoted
);

module.exports = router;
