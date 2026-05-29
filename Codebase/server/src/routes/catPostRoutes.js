const express = require('express');
const router = express.Router();
const catPostController = require('../controllers/catPostController');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { imageUploadErrorHandler } = require("../middleware/uploadErrors");
const { createLimiter } = require("../middleware/security");

// Get all posts (public)
router.get('/', catPostController.getAllPosts);

// Get specific post by ID (public)
router.get('/:id', catPostController.getPostById);

// Create new post (with image upload)
router.post('/', authenticateToken, createLimiter, upload.single('image'), imageUploadErrorHandler, catPostController.createPost);

// Delete post (authenticated)
router.delete('/:id', authenticateToken, catPostController.deletePost);

// Toggle like on post (authenticated)
router.post('/:id/like', authenticateToken, createLimiter, catPostController.toggleLike);

// Add comment to post (authenticated)
router.post('/:id/comment', authenticateToken, createLimiter, catPostController.addComment);

module.exports = router;
