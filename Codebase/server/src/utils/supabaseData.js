const storageService = require("../services/storageService");
const {
  supabaseAdmin,
  isSupabaseAdminConfigured,
} = require("../config/supabase");

const ensureSupabaseAdmin = () => {
  if (!isSupabaseAdminConfigured) {
    throw new Error("Supabase Admin is not configured");
  }
  return supabaseAdmin;
};

const pageRange = (page = 1, limit = 20, maxLimit = 100) => {
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), maxLimit);
  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;
  return { page: safePage, limit: safeLimit, from, to };
};

const profileSelect = "id, display_name, handle, batch, student_id, role, profile_image_path, cover_image_path, department:departments(id, name)";

const mapProfile = (profile) => {
  if (!profile) return null;

  return {
    id: profile.id,
    name: profile.display_name,
    profile: {
      profilePicture: profile.profile_image_path,
    },
  };
};

const requireOwned = (row, userId, ownerField = "user_id") => {
  if (!row) {
    throw new Error("Not found");
  }

  if (row[ownerField] !== userId) {
    throw new Error("Unauthorized");
  }
};

const uploadToBucket = async ({ bucket, userId, file, prefix }) => {
  if (!file) {
    return {
      path: null,
      bucket: null,
      mimeType: null,
      size: null,
    };
  }

  const uploaded = await storageService.uploadObject({
    bucket,
    userId,
    file,
    prefix,
  });

  return {
    path: uploaded.path,
    bucket: uploaded.bucket,
    mimeType: uploaded.mimeType,
    size: uploaded.size,
  };
};

const publicUrl = (bucket, objectPath) => {
  if (!bucket || !objectPath) return null;
  return storageService.publicUrl(bucket, objectPath);
};

module.exports = {
  ensureSupabaseAdmin,
  mapProfile,
  pageRange,
  profileSelect,
  publicUrl,
  requireOwned,
  uploadToBucket,
};
