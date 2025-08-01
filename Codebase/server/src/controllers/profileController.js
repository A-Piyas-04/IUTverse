const userService = require("../services/userService");
const path = require("path");
const fs = require("fs");

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

// POST /api/profile/upload-picture
const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const userId = req.user.userId;
    // We save the path relative to the uploads directory to make it accessible via the static middleware
    const filePath = `/uploads/profiles/${path.basename(req.file.path)}`;

    // If user already has a profile picture, delete the old one
    const currentProfile = await userService.getProfile(userId);
    if (currentProfile && currentProfile.profilePicture) {
      // Extract the filename from the stored path
      const oldFilename = path.basename(currentProfile.profilePicture);
      const oldImagePath = path.join(
        __dirname,
        "../../uploads/profiles",
        oldFilename
      );

      // Check if file exists and delete it
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // Update the profile with the new profile picture path
    const updatedProfile = await userService.updateProfile(userId, {
      profilePicture: filePath,
    });

    res.status(200).json({
      message: "Profile picture uploaded successfully",
      profilePicture: filePath,
      profile: updatedProfile,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error uploading profile picture",
      error: error.message,
    });
  }
};

// GET /api/profile/picture/:userId
const getProfilePicture = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId))
      return res.status(400).json({ message: "Invalid userId" });

    const profile = await userService.getProfile(userId);
    if (!profile || !profile.profilePicture) {
      return res.status(404).json({ message: "Profile picture not found" });
    }

    // Extract the filename from the stored path
    const filename = path.basename(profile.profilePicture);
    const imagePath = path.join(__dirname, "../../uploads/profiles", filename);

    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      return res
        .status(404)
        .json({ message: "Profile picture file not found" });
    }

    // Send the file with proper content type
    res.set("Content-Type", "image/jpeg"); // Adjust based on file type if needed
    res.sendFile(imagePath);
  } catch (error) {
    res.status(500).json({
      message: "Error retrieving profile picture",
      error: error.message,
    });
  }
};

// DELETE /api/profile/picture
const deleteProfilePicture = async (req, res) => {
  try {
    const userId = req.user.userId;

    const profile = await userService.getProfile(userId);
    if (!profile || !profile.profilePicture) {
      return res.status(404).json({ message: "Profile picture not found" });
    }

    // Extract the filename from the stored path
    const filename = path.basename(profile.profilePicture);
    const imagePath = path.join(__dirname, "../../uploads/profiles", filename);

    // Check if file exists and delete it
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    // Update the profile to remove the profile picture reference
    await userService.updateProfile(userId, {
      profilePicture: null,
    });

    res.status(200).json({ message: "Profile picture deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting profile picture",
      error: error.message,
    });
  }
};

module.exports = {
  getProfile,
  createProfile,
  updateProfile,
  uploadProfilePicture,
  getProfilePicture,
  deleteProfilePicture,
};
