const path = require("path");
const {
  supabaseAdmin,
  isSupabaseAdminConfigured,
} = require("../config/supabase");

const ensureStorage = () => {
  if (!isSupabaseAdminConfigured) {
    throw new Error("Supabase Storage is not configured");
  }
};

const safeExtension = (fileName = "", mimeType = "") => {
  const ext = path.extname(fileName).toLowerCase();
  if (ext && /^[a-z0-9.]+$/.test(ext)) return ext;

  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "image/gif") return ".gif";
  if (mimeType === "application/pdf") return ".pdf";
  return "";
};

const buildObjectPath = (userId, file, prefix = "upload") => {
  const extension = safeExtension(file.originalname, file.mimetype);
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  return `${userId}/${prefix}-${unique}${extension}`;
};

const uploadObject = async ({ bucket, userId, file, prefix }) => {
  ensureStorage();

  const objectPath = buildObjectPath(userId, file, prefix);
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(objectPath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) throw error;

  return {
    bucket,
    path: objectPath,
    mimeType: file.mimetype,
    size: file.size,
  };
};

const removeObject = async ({ bucket, objectPath }) => {
  ensureStorage();
  if (!bucket || !objectPath) return;

  const { error } = await supabaseAdmin.storage.from(bucket).remove([objectPath]);
  if (error) throw error;
};

const publicUrl = (bucket, objectPath) => {
  ensureStorage();
  if (!bucket || !objectPath) return null;

  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(objectPath);
  return data.publicUrl;
};

module.exports = {
  uploadObject,
  removeObject,
  publicUrl,
};
