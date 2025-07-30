const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const upload = require("../middleware/upload");
const { handleUploadError } = require("../middleware/upload");
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

// Picture upload routes (protected)
router.post(
  "/profile/upload-profile-picture",
  authenticateToken,
  upload.single("profilePicture"),
  handleUploadError,
  profileController.uploadProfilePicture
);

router.post(
  "/profile/upload-cover-picture",
  authenticateToken,
  upload.single("coverPicture"),
  handleUploadError,
  profileController.uploadCoverPicture
);

// Picture delete routes (protected)
router.delete(
  "/profile/profile-picture",
  authenticateToken,
  profileController.deleteProfilePicture
);

router.delete(
  "/profile/cover-picture",
  authenticateToken,
  profileController.deleteCoverPicture
);

// Get profile pictures (protected)
router.get(
  "/profile/pictures",
  (req, res, next) => {
    console.log("Route /profile/pictures hit");
    console.log("Request headers:", req.headers.authorization);
    next();
  },
  authenticateToken,
  (req, res, next) => {
    console.log("After authentication middleware, req.user:", req.user);
    next();
  },
  profileController.getProfilePictures
);

// Update user name (protected)
router.put("/user", authenticateToken, userController.updateUserName);

// Get user by ID (public - for viewing other profiles)
router.get("/user/:userId", userController.getUserById);

// Search users (protected)
router.get("/search", authenticateToken, userController.searchUsers);

module.exports = router;
