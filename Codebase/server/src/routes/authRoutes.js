const express = require('express');
const router = express.Router();
const { signup, login, getAllUsers, validateToken } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Signup endpoint
router.post('/signup', signup);

// Login endpoint
router.post('/login', login);

// Token validation endpoint (protected)
router.get('/validate', authenticateToken, validateToken);

// Get all users endpoint (for development/testing)
router.get('/users', getAllUsers);

module.exports = router;
