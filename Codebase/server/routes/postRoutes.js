const express = require("express");
const router = express.Router();
const postController = require("../controllers/postController");
const commentController = require("../controllers/commentController");
const { authenticate } = require("../middleware/authMiddleware");
const multer = require("multer");

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB file size limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

// POST ROUTES
// Create a new post
router.post(
  "/",
  authenticate,
  upload.single("image"),
  postController.createPost
);

// Get all posts (paginated)
router.get("/", postController.getPosts);

// Get a single post by ID with all comments
router.get("/:id", postController.getPost);

// Update a post
router.put(
  "/:id",
  authenticate,
  upload.single("image"),
  postController.updatePost
);

// Delete a post
router.delete("/:id", authenticate, postController.deletePost);

// React to a post (like, etc.)
router.post("/:id/react", authenticate, postController.reactToPost);

// Get user's personalized feed
router.get("/feed/user", authenticate, postController.getUserFeed);

// COMMENT ROUTES
// Create a comment on a post
router.post("/:postId/comments", authenticate, commentController.createComment);

// Get all comments for a post
router.get("/:postId/comments", commentController.getPostComments);

// Get replies for a specific comment
router.get("/comments/:commentId/replies", commentController.getCommentReplies);

// Update a comment
router.put(
  "/comments/:commentId",
  authenticate,
  commentController.updateComment
);

// Delete a comment
router.delete(
  "/comments/:commentId",
  authenticate,
  commentController.deleteComment
);

module.exports = router;
