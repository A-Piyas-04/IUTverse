const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const jobController = require('../controllers/jobController');

// Public
router.get('/jobs', jobController.getAllJobs);
router.get('/jobs/:id', jobController.getJobById);

// Protected
router.post('/jobs', authenticateToken, jobController.createJob);
router.put('/jobs/:id', authenticateToken, jobController.updateJob);

module.exports = router; 