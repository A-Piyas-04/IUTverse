import "server-only";
import type { Handler } from "../http/context";
import * as response from "../http/responses";
import { json, redirect } from "../http/responses";
import userService from "../services/userService";
import * as storageService from "../services/storageService";
import logger from "../utils/logger";
import { uuid } from "../utils/validation";

export const getOwnProfile: Handler = async (ctx) => {
  try {
    const profile = await userService.getOwnerUserById(ctx.user!.id);
    if (!profile) return response.notFound("Profile not found");
    return response.success(profile);
  } catch (error: any) {
    return response.serverError("Error fetching private profile", error.message);
  }
};

export const patchOwnProfile: Handler = async (ctx) => {
  try {
    const profile = await userService.updateProfile(ctx.user!.id, ctx.body);
    return response.success(profile, "Profile updated");
  } catch (error: any) {
    return error.statusCode === 400
      ? response.badRequest(error.message)
      : response.serverError("Error updating profile", error.message);
  }
};

export const getProfileReferenceData: Handler = async () => {
  try {
    return response.success(await userService.getProfileReferenceData());
  } catch (error: any) {
    return response.serverError("Error fetching profile reference data", error.message);
  }
};

// GET /api/profile/:userId
export const getProfile: Handler = async (ctx) => {
  try {
    const userIdResult = uuid(ctx.params.userId, "User ID");
    if (!userIdResult.ok) return response.badRequest(userIdResult.error);

    const userId = userIdResult.value;
    const profile = ctx.user?.id === userId
      ? await userService.getOwnerUserById(userId)
      : await userService.getPublicUserById(userId);
    if (!profile) return response.notFound("Profile not found");
    return json(200, profile);
  } catch (error: any) {
    return json(500, { message: "Error fetching profile", error: error.message });
  }
};

// POST /api/profile
export const createProfile: Handler = async (ctx) => {
  try {
    const userId = ctx.user!.userId;
    const profile = await userService.createProfile(userId, ctx.body);
    return json(201, profile);
  } catch (error: any) {
    return json(500, { message: "Error creating profile", error: error.message });
  }
};

// PUT /api/profile
export const updateProfile: Handler = async (ctx) => {
  try {
    const userId = ctx.user!.userId;
    const profile = await userService.updateProfile(userId, ctx.body);
    return json(200, profile);
  } catch (error: any) {
    if (error.statusCode === 400) return response.badRequest(error.message);
    return response.serverError("Error updating profile", error.message);
  }
};

// POST /api/profile/upload-picture
export const uploadProfilePicture: Handler = async (ctx) => {
  try {
    if (!ctx.file) {
      return json(400, { message: "No file uploaded" });
    }

    const userId = ctx.user!.userId;
    const uploaded = await storageService.uploadObject({
      bucket: "avatars",
      userId,
      file: ctx.file,
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

    return json(200, {
      message: "Profile picture uploaded successfully",
      profilePicture: uploaded.path,
      profilePictureUrl: storageService.publicUrl("avatars", uploaded.path),
      profile: updatedProfile,
    });
  } catch (error: any) {
    return json(500, { message: "Error uploading profile picture", error: error.message });
  }
};

// GET /api/profile/picture/:userId
export const getProfilePicture: Handler = async (ctx) => {
  try {
    const userIdResult = uuid(ctx.params.userId, "User ID");
    if (!userIdResult.ok) return response.badRequest(userIdResult.error);

    const userId = userIdResult.value;

    const profile = await userService.getProfile(userId);
    if (!profile || !(profile.profile_image_path || profile.profilePicture)) {
      return json(404, { message: "Profile picture not found" });
    }

    const imagePath = profile.profile_image_path || profile.profilePicture;
    const url = storageService.publicUrl("avatars", imagePath);
    return redirect(url as string);
  } catch (error: any) {
    return json(500, { message: "Error retrieving profile picture", error: error.message });
  }
};

// DELETE /api/profile/picture
export const deleteProfilePicture: Handler = async (ctx) => {
  try {
    const userId = ctx.user!.userId;

    const profile = await userService.getProfile(userId);
    if (!profile || !(profile.profile_image_path || profile.profilePicture)) {
      return json(404, { message: "Profile picture not found" });
    }

    const imagePath = profile.profile_image_path || profile.profilePicture;
    await storageService.removeObject({ bucket: "avatars", objectPath: imagePath });

    await userService.updateProfile(userId, {
      profilePicture: null,
    });

    return json(200, { message: "Profile picture deleted successfully" });
  } catch (error: any) {
    return json(500, { message: "Error deleting profile picture", error: error.message });
  }
};

// POST /api/profile/upload-cover
export const uploadCoverPicture: Handler = async (ctx) => {
  try {
    if (!ctx.file) {
      return json(400, { message: "No file uploaded" });
    }

    const userId = ctx.user!.userId;
    const uploaded = await storageService.uploadObject({
      bucket: "covers",
      userId,
      file: ctx.file,
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

    return json(200, {
      message: "Cover picture uploaded successfully",
      coverPicture: uploaded.path,
      coverPictureUrl: storageService.publicUrl("covers", uploaded.path),
      profile: updatedProfile,
    });
  } catch (error: any) {
    return json(500, { message: "Error uploading cover picture", error: error.message });
  }
};

// GET /api/profile/cover/:userId
export const getCoverPicture: Handler = async (ctx) => {
  try {
    const userIdResult = uuid(ctx.params.userId, "User ID");
    if (!userIdResult.ok) return response.badRequest(userIdResult.error);

    const userId = userIdResult.value;

    const profile = await userService.getProfile(userId);
    if (!profile || !(profile.cover_image_path || profile.coverPicture)) {
      return json(404, { message: "Cover picture not found" });
    }

    const imagePath = profile.cover_image_path || profile.coverPicture;
    const url = storageService.publicUrl("covers", imagePath);
    return redirect(url as string);
  } catch (error: any) {
    return json(500, { message: "Error retrieving cover picture", error: error.message });
  }
};

// DELETE /api/profile/cover
export const deleteCoverPicture: Handler = async (ctx) => {
  try {
    const userId = ctx.user!.userId;

    const profile = await userService.getProfile(userId);
    if (!profile || !(profile.cover_image_path || profile.coverPicture)) {
      return json(404, { message: "Cover picture not found" });
    }

    const imagePath = profile.cover_image_path || profile.coverPicture;
    await storageService.removeObject({ bucket: "covers", objectPath: imagePath });

    await userService.updateProfile(userId, {
      coverPicture: null,
    });

    return json(200, { message: "Cover picture deleted successfully" });
  } catch (error: any) {
    return json(500, { message: "Error deleting cover picture", error: error.message });
  }
};
