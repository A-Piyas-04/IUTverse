const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');

// Root route
router.get('/', (req, res) => {
  res.send('IUTverse Server is running!');
});

// Auth routes
router.use('/api', authRoutes);

module.exports = router;
