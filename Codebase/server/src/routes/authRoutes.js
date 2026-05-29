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

// Signup endpoint
router.post('/signup', signup);

// Login endpoint
router.post('/login', login);

// Password reset/change endpoints
router.post('/password/reset-request', requestPasswordReset);
router.put('/password', authenticateToken, changePassword);

// Token validation endpoint (protected)
router.get('/validate', authenticateToken, validateToken);

// Get all users endpoint
router.get('/users', authenticateToken, getAllUsers);

module.exports = router;
