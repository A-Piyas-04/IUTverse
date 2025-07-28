const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const postsService = require('../services/postsService');
const profileController = require('../controllers/profileController');

// Get user profile with posts (protected route)
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userPosts = await postsService.getPostsByUserId(userId);
    
    res.json({
      success: true,
      message: 'Profile data',
      user: req.user,
      posts: userPosts
    });
  } catch (error) {
    console.error('Error fetching profile data:', error);
    res.status(500).json({
      message: 'Failed to fetch profile data',
      error: error.message
    });
  }
});

// Get user dashboard data with posts (protected route)
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userPosts = await postsService.getPostsByUserId(userId);
    const allPosts = await postsService.getAllPosts();
    
    res.json({
      success: true,
      message: 'Dashboard data',
      user: req.user,
      data: {
        posts: userPosts,
        feed: allPosts,
        notifications: [],
        stats: {
          totalPosts: userPosts.length,
          totalLikes: userPosts.reduce((sum, post) => sum + post.likes, 0)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      message: 'Failed to fetch dashboard data',
      error: error.message
    });
  }
});

// Get profile by userId (public)
router.get('/profile/:userId', profileController.getProfile);
// Create profile (protected)
router.post('/profile', authenticateToken, profileController.createProfile);
// Update profile (protected)
router.put('/profile', authenticateToken, profileController.updateProfile);

module.exports = router;
