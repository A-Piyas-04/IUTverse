const express = require('express');
const router = express.Router();
const {
  signup,
  login,
  requestPasswordReset,
  changePassword,
  getAllUsers,
  validateToken,
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { authLimiter } = require("../middleware/security");

// Signup endpoint
router.post('/signup', authLimiter, signup);

// Login endpoint
router.post('/login', authLimiter, login);

// Password reset/change endpoints
router.post('/password/reset-request', authLimiter, requestPasswordReset);
router.put('/password', authenticateToken, authLimiter, changePassword);

// Token validation endpoint (protected)
router.get('/validate', authenticateToken, validateToken);

// Get all users endpoint
router.get('/users', authenticateToken, getAllUsers);

module.exports = router;
