const express = require("express");
const router = express.Router();
const postController = require("../controllers/postController");
const commentController = require("../controllers/commentController");
const { authenticateToken } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// POST ROUTES
// Create a new post
router.post(
  "/posts",
  authenticateToken,
  upload.single("image"),
  postController.createPost
);

// Get all posts (paginated)
router.get("/posts", postController.getPosts);

// Get a single post by ID with all comments
router.get("/posts/:id", postController.getPost);

// Update a post
router.put(
  "/posts/:id",
  authenticateToken,
  upload.single("image"),
  postController.updatePost
);

// Delete a post
router.delete("/posts/:id", authenticateToken, postController.deletePost);

// React to a post (like, etc.)
router.post("/posts/:id/react", authenticateToken, postController.reactToPost);

// Get user's personalized feed
router.get("/feed", authenticateToken, postController.getUserFeed);

// COMMENT ROUTES
// Create a comment on a post
router.post(
  "/posts/:postId/comments",
  authenticateToken,
  commentController.createComment
);

// Get all comments for a post
router.get("/posts/:postId/comments", commentController.getPostComments);

// Get replies for a specific comment
router.get("/comments/:commentId/replies", commentController.getCommentReplies);

// Update a comment
router.put(
  "/comments/:commentId",
  authenticateToken,
  commentController.updateComment
);

// Delete a comment
router.delete(
  "/comments/:commentId",
  authenticateToken,
  commentController.deleteComment
);

module.exports = router;
