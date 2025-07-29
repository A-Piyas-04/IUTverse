const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getAllPosts,
  getPostsByUserId,
  getCurrentUserPosts,
  createPost,
  deletePost,
  toggleLike,
  getPostReactions
} = require('../controllers/postsController');

// Get all posts for homepage feed
router.get('/', authenticateToken, getAllPosts);

// Get current user's posts
router.get('/my-posts', authenticateToken, getCurrentUserPosts);

// Create a new post
router.post('/', authenticateToken, createPost);

// Get posts by specific user ID
router.get('/user/:userId', authenticateToken, getPostsByUserId);

// Delete a post
router.delete('/:postId', authenticateToken, deletePost);

// Like/unlike a post
router.post('/:postId/like', authenticateToken, toggleLike);

// Get post reactions
router.get('/:postId/reactions', authenticateToken, getPostReactions);

module.exports = router;
