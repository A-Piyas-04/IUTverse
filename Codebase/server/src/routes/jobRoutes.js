const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const jobController = require("../controllers/jobController");
const jobCommentController = require("../controllers/jobCommentController");
const jobApplicationController = require("../controllers/jobApplicationController");
const { createLimiter } = require("../middleware/security");

// Public - Jobs
router.get("/jobs", jobController.getAllJobs);
router.get("/jobs/:id", jobController.getJobById);

// Public - Comments (can view comments without authentication)
router.get("/jobs/:jobId/comments", jobCommentController.getCommentsByJobId);
router.get("/jobs/comments/:commentId", jobCommentController.getCommentById);

// Public - Job Applications (view count and list)
router.get(
  "/jobs/:jobId/applications",
  authenticateToken,
  jobApplicationController.getJobApplications
);
router.get(
  "/jobs/:jobId/applications/count",
  jobApplicationController.getApplicationCount
);

// Protected - Jobs
router.post("/jobs", authenticateToken, createLimiter, jobController.createJob);
router.put("/jobs/:id", authenticateToken, createLimiter, jobController.updateJob);
router.delete("/jobs/:id", authenticateToken, createLimiter, jobController.deleteJob);

// Protected - Comments
router.post(
  "/jobs/:jobId/comments",
  authenticateToken,
  createLimiter,
  jobCommentController.createComment
);
router.post(
  "/jobs/:jobId/comments/:commentId/reply",
  authenticateToken,
  createLimiter,
  jobCommentController.createReply
);
router.put(
  "/jobs/comments/:commentId",
  authenticateToken,
  createLimiter,
  jobCommentController.updateComment
);
router.delete(
  "/jobs/comments/:commentId",
  authenticateToken,
  jobCommentController.deleteComment
);

// Protected - Job Applications
router.post(
  "/jobs/:jobId/apply",
  authenticateToken,
  createLimiter,
  jobApplicationController.applyToJob
);
router.delete(
  "/jobs/:jobId/apply",
  authenticateToken,
  jobApplicationController.removeApplication
);
router.get(
  "/jobs/:jobId/application-status",
  authenticateToken,
  jobApplicationController.getUserApplicationStatus
);

module.exports = router;
