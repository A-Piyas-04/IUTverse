const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const jobController = require("../controllers/jobController");
const jobCommentController = require("../controllers/jobCommentController");
const jobApplicationController = require("../controllers/jobApplicationController");

// Public - Jobs
router.get("/", jobController.getAllJobs);
router.get("/:id", jobController.getJobById);

// Public - Comments (can view comments without authentication)
router.get("/:jobId/comments", jobCommentController.getCommentsByJobId);
router.get("/comments/:commentId", jobCommentController.getCommentById);

// Public - Job Applications (view count and list)
router.get(
  "/:jobId/applications",
  jobApplicationController.getJobApplications
);
router.get(
  "/:jobId/applications/count",
  jobApplicationController.getApplicationCount
);

// Protected - Jobs
router.post("/", authenticateToken, jobController.createJob);
router.put("/:id", authenticateToken, jobController.updateJob);

// Protected - Comments
router.post(
  "/:jobId/comments",
  authenticateToken,
  jobCommentController.createComment
);
router.post(
  "/:jobId/comments/:commentId/reply",
  authenticateToken,
  jobCommentController.createReply
);
router.put(
  "/comments/:commentId",
  authenticateToken,
  jobCommentController.updateComment
);
router.delete(
  "/comments/:commentId",
  authenticateToken,
  jobCommentController.deleteComment
);

// Protected - Job Applications
router.post(
  "/:jobId/apply",
  authenticateToken,
  jobApplicationController.applyToJob
);
router.delete(
  "/:jobId/apply",
  authenticateToken,
  jobApplicationController.removeApplication
);
router.get(
  "/:jobId/application-status",
  authenticateToken,
  jobApplicationController.getUserApplicationStatus
);

module.exports = router;
