const express = require('express');
const router = express.Router();
const { signup, login, getAllUsers } = require('../controllers/authController');

// Signup endpoint
router.post('/signup', signup);

// Login endpoint
router.post('/login', login);

// Get all users endpoint (for development/testing)
router.get('/users', getAllUsers);

module.exports = router;
