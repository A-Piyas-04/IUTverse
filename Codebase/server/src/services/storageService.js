const {
  supabaseAdmin,
  isSupabaseAdminConfigured,
} = require("../config/supabase");
const { validateUploadedFile } = require("../utils/fileValidation");

const ensureStorage = () => {
  if (!isSupabaseAdminConfigured) {
    throw new Error("Supabase Storage is not configured");
  }
};

const safeSegment = (value, fallback = "upload") =>
  String(value || fallback)
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || fallback;

const buildObjectPath = (userId, prefix = "upload", extension = "") => {
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  return `${safeSegment(userId, "anonymous")}/${safeSegment(prefix)}-${unique}${extension}`;
};

const uploadObject = async ({ bucket, userId, file, prefix }) => {
  ensureStorage();

  const fileType = validateUploadedFile(file, { bucket });
  const objectPath = buildObjectPath(userId, prefix, fileType.extension);
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(objectPath, file.buffer, {
      contentType: fileType.mimeType,
      upsert: false,
    });

  if (error) throw error;

  return {
    bucket,
    path: objectPath,
    mimeType: fileType.mimeType,
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

const signedUrl = async (bucket, objectPath, expiresIn = 300) => {
  ensureStorage();
  if (!bucket || !objectPath) return null;
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(objectPath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
};

module.exports = {
  buildObjectPath,
  uploadObject,
  removeObject,
  publicUrl,
  signedUrl,
};
