const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Get user profile (protected route)
router.get('/profile', authenticateToken, (req, res) => {
  res.json({
    message: 'Profile data',
    user: req.user
  });
});

// Get user dashboard data (protected route)
router.get('/dashboard', authenticateToken, (req, res) => {
  res.json({
    message: 'Dashboard data',
    user: req.user,
    data: {
      posts: [],
      notifications: [],
      stats: {}
    }
  });
});

module.exports = router;
