const userService = require('../services/userService');

// GET /api/profile/:userId
const getProfile = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId)) return res.status(400).json({ message: 'Invalid userId' });
    const profile = await userService.getProfile(userId);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
};

// POST /api/profile
const createProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const profileData = req.body;
    const profile = await userService.createProfile(userId, profileData);
    res.status(201).json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Error creating profile', error: error.message });
  }
};

// PUT /api/profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const profileData = req.body;
    const profile = await userService.updateProfile(userId, profileData);
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
};

module.exports = { getProfile, createProfile, updateProfile }; 