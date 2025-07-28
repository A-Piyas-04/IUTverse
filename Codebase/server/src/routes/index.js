const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const postsRoutes = require('./postsRoutes');

// Root route
router.get('/', (req, res) => {
  res.send('IUTverse Server is running!');
});

// Auth routes
router.use('/api/auth', authRoutes);

// User routes
router.use('/api', userRoutes);

// Posts routes
router.use('/api', postsRoutes);

module.exports = router;
