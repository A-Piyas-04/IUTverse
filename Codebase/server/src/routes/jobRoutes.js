const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const jobController = require("../controllers/jobController");
const jobCommentController = require("../controllers/jobCommentController");
const jobApplicationController = require("../controllers/jobApplicationController");

// Public - Jobs
router.get("/jobs", jobController.getAllJobs);
router.get("/jobs/:id", jobController.getJobById);

// Public - Comments (can view comments without authentication)
router.get("/jobs/:jobId/comments", jobCommentController.getCommentsByJobId);
router.get("/jobs/comments/:commentId", jobCommentController.getCommentById);

// Public - Job Applications (view count and list)
router.get(
  "/jobs/:jobId/applications",
  jobApplicationController.getJobApplications
);
router.get(
  "/jobs/:jobId/applications/count",
  jobApplicationController.getApplicationCount
);

// Protected - Jobs
router.post("/jobs", authenticateToken, jobController.createJob);
router.put("/jobs/:id", authenticateToken, jobController.updateJob);

// Protected - Comments
router.post(
  "/jobs/:jobId/comments",
  authenticateToken,
  jobCommentController.createComment
);
router.post(
  "/jobs/:jobId/comments/:commentId/reply",
  authenticateToken,
  jobCommentController.createReply
);
router.put(
  "/jobs/comments/:commentId",
  authenticateToken,
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
