const express = require('express');
const router = express.Router();
const catPostController = require('../controllers/catPostController');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Get all posts (public)
router.get('/', catPostController.getAllPosts);

// Get specific post by ID (public)
router.get('/:id', catPostController.getPostById);

// Create new post (with image upload)
router.post('/', upload.single('image'), catPostController.createPost);

// Delete post (authenticated)
router.delete('/:id', authenticateToken, catPostController.deletePost);

// Toggle like on post (authenticated)
router.post('/:id/like', authenticateToken, catPostController.toggleLike);

// Add comment to post (authenticated)
router.post('/:id/comment', authenticateToken, catPostController.addComment);

module.exports = router;