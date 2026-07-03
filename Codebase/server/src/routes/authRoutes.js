const express = require('express');
const router = express.Router();
const {
  signup,
  login,
  requestPasswordReset,
  changePassword,
  getAllUsers,
  validateToken,
  getMe,
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require("../middleware/authorization");
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
router.get('/me', authenticateToken, getMe);

// Get all users endpoint
router.get('/users', authenticateToken, requireAdmin, getAllUsers);

module.exports = router;
