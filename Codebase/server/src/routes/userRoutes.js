const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const profileController = require("../controllers/profileController");
const userController = require("../controllers/userController");

// Get user profile (protected route)
router.get("/profile", authenticateToken, (req, res) => {
  res.json({
    message: "Profile data",
    user: req.user,
  });
});

// Get user dashboard data (protected route)
router.get("/dashboard", authenticateToken, (req, res) => {
  res.json({
    message: "Dashboard data",
    user: req.user,
    data: {
      posts: [],
      notifications: [],
      stats: {},
    },
  });
});

// Get profile by userId (public)
router.get("/profile/:userId", profileController.getProfile);
// Create profile (protected)
router.post("/profile", authenticateToken, profileController.createProfile);
// Update profile (protected)
router.put("/profile", authenticateToken, profileController.updateProfile);

// Update user name (protected)
router.put("/user", authenticateToken, userController.updateUserName);

module.exports = router;
