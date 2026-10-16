// Direct-to-Storage uploads. Serverless hosts cap request bodies (about 4.5 MB
// on Vercel), so large files go from the browser straight to Supabase Storage:
//
//   1. createUploadIntent: the API checks purpose, type, size and (for chat)
//      conversation membership, picks the object path, and returns a signed
//      upload URL for exactly that path.
//   2. The browser uploads to the signed URL.
//   3. claimUpload: the route that consumes the file re-checks the stored
//      object (owner folder, size, magic bytes, declared type) before any row
//      references it, and deletes the object if it fails.
//
// Bucket allowed_mime_types / file_size_limit stay in force as a backstop.
const { supabaseAdmin, isSupabaseAdminConfigured } = require("../config/supabase");
const { buildObjectPath } = require("./storageService");
const chatService = require("./chatService");
const { detectFileType, extensionForMime, imageMimeTypes, pdfMimeTypes, publicFileError } = require("../utils/fileValidation");

const MB = 1024 * 1024;
const IMAGES = Object.freeze([...imageMimeTypes]);
const PDF = Object.freeze([...pdfMimeTypes]);

// One entry per consuming route. Bucket, prefix and size cap match what the
// multipart path for the same route accepts.
const UPLOAD_PURPOSES = Object.freeze({
  avatar: { bucket: "avatars", prefix: "profile", maxBytes: 2 * MB, mimeTypes: IMAGES },
  cover: { bucket: "covers", prefix: "cover", maxBytes: 5 * MB, mimeTypes: IMAGES },
  post: { bucket: "post-media", prefix: "post", maxBytes: 5 * MB, mimeTypes: IMAGES },
  lostFound: { bucket: "lost-found", prefix: "item", maxBytes: 5 * MB, mimeTypes: IMAGES },
  catPost: { bucket: "cat-posts", prefix: "cat-post", maxBytes: 5 * MB, mimeTypes: IMAGES },
  event: { bucket: "event-images", prefix: "event", maxBytes: 5 * MB, mimeTypes: IMAGES },
  resource: { bucket: "academic-resources", prefix: "resource", maxBytes: 10 * MB, mimeTypes: PDF },
  chat: { bucket: "chat-attachments", prefix: "message", maxBytes: 10 * MB, mimeTypes: [...IMAGES, ...PDF] },
});

// Enough bytes for every signature in fileValidation.js.
const HEAD_BYTES = 32;

const forbiddenError = (message) => Object.assign(publicFileError(message), { statusCode: 403 });

const ensureStorage = () => {
  if (!isSupabaseAdminConfigured) throw new Error("Supabase Storage is not configured");
};

const purposeSpec = (purpose) => {
  const spec = Object.prototype.hasOwnProperty.call(UPLOAD_PURPOSES, purpose) ? UPLOAD_PURPOSES[purpose] : null;
  if (!spec) throw publicFileError(`Upload purpose must be one of: ${Object.keys(UPLOAD_PURPOSES).join(", ")}`);
  return spec;
};

const createUploadIntent = async ({ userId, purpose, mimeType, size, conversationId }) => {
  ensureStorage();
  const spec = purposeSpec(purpose);
  const type = String(mimeType || "").toLowerCase();
  if (!spec.mimeTypes.includes(type)) throw publicFileError("This file type is not allowed here");
  const bytes = Number(size);
  if (!Number.isInteger(bytes) || bytes <= 0) throw publicFileError("File size is required");
  if (bytes > spec.maxBytes) throw publicFileError(`File is too large. Maximum size is ${spec.maxBytes / MB} MB.`);

  if (purpose === "chat") {
    const conversation = Number(conversationId);
    if (!Number.isInteger(conversation) || conversation <= 0) throw publicFileError("Conversation ID must be a positive integer");
    if (!(await chatService.isParticipant(conversation, userId))) throw forbiddenError("Conversation not found or access denied");
  }

  const path = buildObjectPath(userId, spec.prefix, extensionForMime(type));
  const { data, error } = await supabaseAdmin.storage.from(spec.bucket).createSignedUploadUrl(path);
  if (error) throw error;
  return { purpose, bucket: spec.bucket, path: data.path || path, token: data.token, signedUrl: data.signedUrl, mimeType: type, maxBytes: spec.maxBytes };
};

// Reads the first bytes of a stored object without loading all of it.
const readHead = async (storage, path) => {
  const { data, error } = await storage.createSignedUrl(path, 60);
  if (error) throw error;
  const res = await fetch(data.signedUrl, { headers: { Range: `bytes=0-${HEAD_BYTES - 1}` } });
  if (!res.ok || !res.body) throw publicFileError("Uploaded file could not be read");
  const chunks = [];
  let length = 0;
  const reader = res.body.getReader();
  while (length < HEAD_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(Buffer.from(value));
    length += value.length;
  }
  await reader.cancel().catch(() => {});
  return Buffer.concat(chunks).subarray(0, HEAD_BYTES);
};

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Returns a multer-like descriptor marked `stored` that storageService.uploadObject
// passes through instead of uploading again.
const claimUpload = async ({ userId, purpose, path }) => {
  ensureStorage();
  const spec = purposeSpec(purpose);
  // Only objects the API named for this user and purpose: <userId>/<prefix>-<ts>-<rand>.<ext>
  const shape = new RegExp(`^${escapeRegExp(userId)}/${escapeRegExp(spec.prefix)}-\\d+-\\d+\\.[a-z]+$`);
  if (typeof path !== "string" || !shape.test(path)) throw publicFileError("Invalid upload reference");

  const storage = supabaseAdmin.storage.from(spec.bucket);
  const { data: info, error } = await storage.info(path);
  if (error || !info) throw publicFileError("Upload not found. Upload the file again.");

  const reject = async (message) => {
    await storage.remove([path]).catch(() => {});
    throw publicFileError(message);
  };

  const size = Number(info.size);
  if (!Number.isInteger(size) || size <= 0) return reject("Uploaded file is empty or invalid");
  if (size > spec.maxBytes) return reject(`File is too large. Maximum size is ${spec.maxBytes / MB} MB.`);

  const detected = detectFileType(await readHead(storage, path));
  if (!detected || !spec.mimeTypes.includes(detected.mimeType)) return reject("Uploaded file content does not match an allowed file type");
  const declared = String(info.contentType || info.metadata?.mimetype || "").toLowerCase();
  if (declared !== detected.mimeType || !path.endsWith(detected.extension)) {
    return reject("Uploaded file content does not match its declared content type");
  }

  return {
    stored: true,
    bucket: spec.bucket,
    path,
    mimetype: detected.mimeType,
    size,
    originalname: path.slice(path.lastIndexOf("/") + 1),
  };
};

module.exports = { UPLOAD_PURPOSES, claimUpload, createUploadIntent };
