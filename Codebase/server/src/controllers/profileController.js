const userService = require("../services/userService");

// GET /api/profile/:userId
const getProfile = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId))
      return res.status(400).json({ message: "Invalid userId" });
    const profile = await userService.getProfile(userId);
    if (!profile) return res.status(404).json({ message: "Profile not found" });
    res.json(profile);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching profile", error: error.message });
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
    res
      .status(500)
      .json({ message: "Error creating profile", error: error.message });
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
    res
      .status(500)
      .json({ message: "Error updating profile", error: error.message });
  }
};

// POST /api/profile/upload-profile-picture
const uploadProfilePicture = async (req, res) => {
  try {
    const userId = parseInt(req.user.userId, 10);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const profile = await userService.uploadProfilePicture(
      userId,
      req.file.buffer,
      req.file.originalname
    );

    res.json({
      success: true,
      message: "Profile picture uploaded successfully",
      data: {
        profilePicture: profile.profilePicture,
      },
    });
  } catch (error) {
    console.error("Error uploading profile picture:", error);
    res.status(500).json({
      success: false,
      message: "Error uploading profile picture",
      error: error.message,
    });
  }
};

// POST /api/profile/upload-cover-picture
const uploadCoverPicture = async (req, res) => {
  try {
    const userId = parseInt(req.user.userId, 10);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const profile = await userService.uploadCoverPicture(
      userId,
      req.file.buffer,
      req.file.originalname
    );

    res.json({
      success: true,
      message: "Cover picture uploaded successfully",
      data: {
        coverPicture: profile.coverPicture,
      },
    });
  } catch (error) {
    console.error("Error uploading cover picture:", error);
    res.status(500).json({
      success: false,
      message: "Error uploading cover picture",
      error: error.message,
    });
  }
};

// DELETE /api/profile/profile-picture
const deleteProfilePicture = async (req, res) => {
  try {
    const userId = parseInt(req.user.userId, 10);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId",
      });
    }

    const profile = await userService.deleteProfilePicture(userId);

    res.json({
      success: true,
      message: "Profile picture deleted successfully",
      data: profile,
    });
  } catch (error) {
    console.error("Error deleting profile picture:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting profile picture",
      error: error.message,
    });
  }
};

// DELETE /api/profile/cover-picture
const deleteCoverPicture = async (req, res) => {
  try {
    const userId = parseInt(req.user.userId, 10);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId",
      });
    }

    const profile = await userService.deleteCoverPicture(userId);

    res.json({
      success: true,
      message: "Cover picture deleted successfully",
      data: profile,
    });
  } catch (error) {
    console.error("Error deleting cover picture:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting cover picture",
      error: error.message,
    });
  }
};

// GET /api/profile/pictures
const getProfilePictures = async (req, res) => {
  try {
    console.log("getProfilePictures - req.user:", req.user);
    console.log("getProfilePictures - req.user.userId:", req.user?.userId);
    console.log("getProfilePictures - typeof userId:", typeof req.user?.userId);

    const userId = parseInt(req.user.userId, 10);
    console.log("getProfilePictures - parsed userId:", userId);

    if (isNaN(userId)) {
      console.log(
        "getProfilePictures - userId is NaN, original value:",
        req.user?.userId
      );
      return res.status(400).json({
        success: false,
        message: "Invalid userId",
      });
    }
    const pictures = await userService.getProfilePictures(userId);

    res.json({
      success: true,
      data: pictures,
    });
  } catch (error) {
    console.error("Error getting profile pictures:", error);
    res.status(500).json({
      success: false,
      message: "Error getting profile pictures",
      error: error.message,
    });
  }
};

module.exports = {
  getProfile,
  createProfile,
  updateProfile,
  uploadProfilePicture,
  uploadCoverPicture,
  deleteProfilePicture,
  deleteCoverPicture,
  getProfilePictures,
};
