const express = require('express');
const catPostController = require('../controllers/catPostController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all cat posts
router.get('/', catPostController.getAllCatPosts);

// Get a specific cat post by ID
router.get('/:id', catPostController.getCatPostById);

// Create a new cat post (requires authentication and file upload)
router.post('/', authenticateToken, catPostController.createCatPost);

// Toggle like on a cat post (requires authentication)
router.post('/:id/like', authenticateToken, catPostController.toggleLikeCatPost);

// Add a comment to a cat post (requires authentication)
router.post('/:id/comments', authenticateToken, catPostController.addCommentToCatPost);

// Get comments for a cat post
router.get('/:id/comments', catPostController.getCatPostComments);

// Delete a cat post (requires authentication)
router.delete('/:id', authenticateToken, catPostController.deleteCatPost);

module.exports = router;