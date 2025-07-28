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
router.get('/posts', authenticateToken, getAllPosts);

// Get current user's posts
router.get('/posts/my-posts', authenticateToken, getCurrentUserPosts);

// Create a new post
router.post('/posts', authenticateToken, createPost);

// Get posts by specific user ID
router.get('/posts/user/:userId', authenticateToken, getPostsByUserId);

// Delete a post
router.delete('/posts/:postId', authenticateToken, deletePost);

// Like/unlike a post
router.post('/posts/:postId/like', authenticateToken, toggleLike);

// Get post reactions
router.get('/posts/:postId/reactions', authenticateToken, getPostReactions);

module.exports = router;
