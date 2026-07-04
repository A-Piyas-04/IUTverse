const userService = require("../services/userService");
const storageService = require("../services/storageService");
const response = require("../utils/responses");
const { uuid } = require("../utils/validation");
const logger = require("../utils/logger");

const getOwnProfile = async (req, res) => {
  try {
    const profile = await userService.getOwnerUserById(req.user.id);
    if (!profile) return response.notFound(res, "Profile not found");
    return response.success(res, profile);
  } catch (error) {
    return response.serverError(res, "Error fetching private profile", error.message);
  }
};

const patchOwnProfile = async (req, res) => {
  try {
    const profile = await userService.updateProfile(req.user.id, req.body);
    return response.success(res, profile, "Profile updated");
  } catch (error) {
    return error.statusCode === 400
      ? response.badRequest(res, error.message)
      : response.serverError(res, "Error updating profile", error.message);
  }
};

const getProfileReferenceData = async (_req, res) => {
  try {
    return response.success(res, await userService.getProfileReferenceData());
  } catch (error) {
    return response.serverError(res, "Error fetching profile reference data", error.message);
  }
};

// GET /api/profile/:userId
const getProfile = async (req, res) => {
  try {
    const userIdResult = uuid(req.params.userId, "User ID");
    if (userIdResult.error) return response.badRequest(res, userIdResult.error);

    const userId = userIdResult.value;
    const profile = req.user?.id === userId
      ? await userService.getOwnerUserById(userId)
      : await userService.getPublicUserById(userId);
    if (!profile) return response.notFound(res, "Profile not found");
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
    if (error.statusCode === 400) return response.badRequest(res, error.message);
    return response.serverError(res, "Error updating profile", error.message);
  }
};

// POST /api/profile/upload-picture
const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const userId = req.user.userId;
    const uploaded = await storageService.uploadObject({
      bucket: "avatars",
      userId,
      file: req.file,
      prefix: "profile",
    });

    const currentProfile = await userService.getProfile(userId);
    let updatedProfile;
    try {
      updatedProfile = await userService.updateProfile(userId, { profilePicture: uploaded.path });
    } catch (error) {
      await storageService.removeObject({ bucket: "avatars", objectPath: uploaded.path }).catch(() => {});
      throw error;
    }
    if (currentProfile?.profile_image_path && currentProfile.profile_image_path !== uploaded.path) {
      await storageService.removeObject({ bucket: "avatars", objectPath: currentProfile.profile_image_path })
        .catch((error) => logger.warn("Could not remove replaced avatar", { userId, error: error.message }));
    }

    res.status(200).json({
      message: "Profile picture uploaded successfully",
      profilePicture: uploaded.path,
      profilePictureUrl: storageService.publicUrl("avatars", uploaded.path),
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
    const userIdResult = uuid(req.params.userId, "User ID");
    if (userIdResult.error) return response.badRequest(res, userIdResult.error);

    const userId = userIdResult.value;

    const profile = await userService.getProfile(userId);
    if (!profile || !(profile.profile_image_path || profile.profilePicture)) {
      return res.status(404).json({ message: "Profile picture not found" });
    }

    const imagePath = profile.profile_image_path || profile.profilePicture;
    const url = storageService.publicUrl("avatars", imagePath);
    res.redirect(url);
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
    if (!profile || !(profile.profile_image_path || profile.profilePicture)) {
      return res.status(404).json({ message: "Profile picture not found" });
    }

    const imagePath = profile.profile_image_path || profile.profilePicture;
    await storageService.removeObject({ bucket: "avatars", objectPath: imagePath });

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

// POST /api/profile/upload-cover
const uploadCoverPicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const userId = req.user.userId;
    const uploaded = await storageService.uploadObject({
      bucket: "covers",
      userId,
      file: req.file,
      prefix: "cover",
    });

    const currentProfile = await userService.getProfile(userId);
    let updatedProfile;
    try {
      updatedProfile = await userService.updateProfile(userId, { coverPicture: uploaded.path });
    } catch (error) {
      await storageService.removeObject({ bucket: "covers", objectPath: uploaded.path }).catch(() => {});
      throw error;
    }
    if (currentProfile?.cover_image_path && currentProfile.cover_image_path !== uploaded.path) {
      await storageService.removeObject({ bucket: "covers", objectPath: currentProfile.cover_image_path })
        .catch((error) => logger.warn("Could not remove replaced cover", { userId, error: error.message }));
    }

    res.status(200).json({
      message: "Cover picture uploaded successfully",
      coverPicture: uploaded.path,
      coverPictureUrl: storageService.publicUrl("covers", uploaded.path),
      profile: updatedProfile,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error uploading cover picture",
      error: error.message,
    });
  }
};

// GET /api/profile/cover/:userId
const getCoverPicture = async (req, res) => {
  try {
    const userIdResult = uuid(req.params.userId, "User ID");
    if (userIdResult.error) return response.badRequest(res, userIdResult.error);

    const userId = userIdResult.value;

    const profile = await userService.getProfile(userId);
    if (!profile || !(profile.cover_image_path || profile.coverPicture)) {
      return res.status(404).json({ message: "Cover picture not found" });
    }

    const imagePath = profile.cover_image_path || profile.coverPicture;
    const url = storageService.publicUrl("covers", imagePath);
    res.redirect(url);
  } catch (error) {
    res.status(500).json({
      message: "Error retrieving cover picture",
      error: error.message,
    });
  }
};

// DELETE /api/profile/cover
const deleteCoverPicture = async (req, res) => {
  try {
    const userId = req.user.userId;

    const profile = await userService.getProfile(userId);
    if (!profile || !(profile.cover_image_path || profile.coverPicture)) {
      return res.status(404).json({ message: "Cover picture not found" });
    }

    const imagePath = profile.cover_image_path || profile.coverPicture;
    await storageService.removeObject({ bucket: "covers", objectPath: imagePath });

    await userService.updateProfile(userId, {
      coverPicture: null,
    });

    res.status(200).json({ message: "Cover picture deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting cover picture",
      error: error.message,
    });
  }
};

module.exports = {
  getProfile,
  getOwnProfile,
  getProfileReferenceData,
  patchOwnProfile,
  createProfile,
  updateProfile,
  uploadProfilePicture,
  getProfilePicture,
  deleteProfilePicture,
  uploadCoverPicture,
  getCoverPicture,
  deleteCoverPicture,
};
