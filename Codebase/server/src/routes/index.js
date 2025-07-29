const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const lostAndFoundRoutes = require('./lostAndFoundRoutes');
const catPostRoutes = require('./catPostRoutes');

// Root route
router.get('/', (req, res) => {
  res.send('IUTverse Server is running!');
});

// Auth routes
router.use('/api/auth', authRoutes);

// User routes
router.use('/api', userRoutes);

// Lost and Found routes
router.use('/api/lost-and-found', lostAndFoundRoutes);

// Cat Post routes
router.use('/api/cat-posts', catPostRoutes);

module.exports = router;
