const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const profileController = require("../controllers/profileController");
const userController = require("../controllers/userController");
const profilePictureUpload = require("../middleware/profilePictureUpload");

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

// Get user by ID (public - for viewing other profiles)
router.get("/user/:userId", userController.getUserById);

// Search users (protected - for chat functionality)
router.get("/users/search", authenticateToken, userController.searchUsers);

// Profile picture routes
// Upload profile picture (protected)
router.post(
  "/profile/upload-picture",
  authenticateToken,
  profilePictureUpload.single("profilePicture"),
  profileController.uploadProfilePicture
);

// Get profile picture (public)
router.get("/profile/picture/:userId", profileController.getProfilePicture);

// Delete profile picture (protected)
router.delete(
  "/profile/picture",
  authenticateToken,
  profileController.deleteProfilePicture
);

module.exports = router;
