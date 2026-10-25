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
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin, isSupabaseAdminConfigured } from "../config/supabase";
import { PublicError } from "../http/errors";
import type { UploadedFile } from "../http/context";
import { buildObjectPath } from "./storageService";
import chatService from "./chatService";
import { audioMimeTypes, contentMatchesType, detectFileType, extensionForMime, imageMimeTypes, pdfMimeTypes, publicFileError, videoMimeTypes } from "../utils/fileValidation";

const MB = 1024 * 1024;
const IMAGES: readonly string[] = Object.freeze([...imageMimeTypes]);
const PDF: readonly string[] = Object.freeze([...pdfMimeTypes]);
const VIDEO: readonly string[] = Object.freeze([...videoMimeTypes]);
const AUDIO: readonly string[] = Object.freeze([...audioMimeTypes]);

interface PurposeSpec {
  bucket: string;
  prefix: string;
  maxBytes: number;
  mimeTypes: readonly string[];
  /** Larger caps for some types (chat videos); everything else gets maxBytes. */
  maxBytesByType?: Readonly<Record<string, number>>;
}

// One entry per consuming route. Bucket, prefix and size cap match what the
// multipart path for the same route accepts.
export const UPLOAD_PURPOSES = Object.freeze({
  avatar: { bucket: "avatars", prefix: "profile", maxBytes: 2 * MB, mimeTypes: IMAGES },
  cover: { bucket: "covers", prefix: "cover", maxBytes: 5 * MB, mimeTypes: IMAGES },
  post: { bucket: "post-media", prefix: "post", maxBytes: 5 * MB, mimeTypes: IMAGES },
  lostFound: { bucket: "lost-found", prefix: "item", maxBytes: 5 * MB, mimeTypes: IMAGES },
  catPost: { bucket: "cat-posts", prefix: "cat-post", maxBytes: 5 * MB, mimeTypes: IMAGES },
  event: { bucket: "event-images", prefix: "event", maxBytes: 5 * MB, mimeTypes: IMAGES },
  resource: { bucket: "academic-resources", prefix: "resource", maxBytes: 10 * MB, mimeTypes: PDF },
  chat: {
    bucket: "chat-attachments",
    prefix: "message",
    maxBytes: 10 * MB,
    mimeTypes: [...IMAGES, ...PDF, ...VIDEO, ...AUDIO],
    maxBytesByType: Object.fromEntries(VIDEO.map((type) => [type, 50 * MB])),
  },
} satisfies Record<string, PurposeSpec>);

export type UploadPurpose = keyof typeof UPLOAD_PURPOSES;

const maxBytesFor = (spec: PurposeSpec, mimeType: string) => spec.maxBytesByType?.[mimeType] ?? spec.maxBytes;

// Enough bytes for every signature in fileValidation.ts.
const HEAD_BYTES = 32;

const forbiddenError = (message: string) => new PublicError(message, 403);

const ensureStorage = () => {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) throw new Error("Supabase Storage is not configured");
  return supabaseAdmin;
};

const purposeSpec = (purpose: unknown): PurposeSpec => {
  const spec = typeof purpose === "string" && Object.prototype.hasOwnProperty.call(UPLOAD_PURPOSES, purpose)
    ? UPLOAD_PURPOSES[purpose as UploadPurpose]
    : null;
  if (!spec) throw publicFileError(`Upload purpose must be one of: ${Object.keys(UPLOAD_PURPOSES).join(", ")}`);
  return spec;
};

export const createUploadIntent = async ({
  userId,
  purpose,
  mimeType,
  size,
  conversationId,
}: {
  userId: string;
  purpose: unknown;
  mimeType: unknown;
  size: unknown;
  conversationId?: unknown;
}) => {
  const admin = ensureStorage();
  const spec = purposeSpec(purpose);
  const type = String(mimeType || "").toLowerCase();
  if (!spec.mimeTypes.includes(type)) throw publicFileError("This file type is not allowed here");
  const bytes = Number(size);
  if (!Number.isInteger(bytes) || bytes <= 0) throw publicFileError("File size is required");
  const limit = maxBytesFor(spec, type);
  if (bytes > limit) throw publicFileError(`File is too large. Maximum size is ${limit / MB} MB.`);

  if (purpose === "chat") {
    const conversation = Number(conversationId);
    if (!Number.isInteger(conversation) || conversation <= 0) throw publicFileError("Conversation ID must be a positive integer");
    if (!(await chatService.isParticipant(conversation, userId))) throw forbiddenError("Conversation not found or access denied");
  }

  const path = buildObjectPath(userId, spec.prefix, extensionForMime(type));
  const { data, error } = await admin.storage.from(spec.bucket).createSignedUploadUrl(path);
  if (error) throw error;
  return { purpose, bucket: spec.bucket, path: data.path || path, token: data.token, signedUrl: data.signedUrl, mimeType: type, maxBytes: limit };
};

type BucketApi = ReturnType<SupabaseClient["storage"]["from"]>;

// Reads the first bytes of a stored object without loading all of it.
const readHead = async (storage: BucketApi, path: string) => {
  const { data, error } = await storage.createSignedUrl(path, 60);
  if (error) throw error;
  // no-store keeps Next's fetch cache out of this one-off, per-request read.
  const res = await fetch(data.signedUrl, { headers: { Range: `bytes=0-${HEAD_BYTES - 1}` }, cache: "no-store" });
  if (!res.ok || !res.body) throw publicFileError("Uploaded file could not be read");
  const chunks: Buffer[] = [];
  let length = 0;
  const reader = res.body.getReader();
  while (length < HEAD_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(Buffer.from(value));
    length += value.length;
  }
  // Do not await the cancel. Inside Next's runtime the body can be one branch
  // of a tee()'d stream, whose cancel only settles once the other branch is
  // cancelled too, so awaiting it would hang the request.
  void reader.cancel().catch(() => {});
  return Buffer.concat(chunks).subarray(0, HEAD_BYTES);
};

const escapeRegExp = (value: string) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Returns a multer-like descriptor marked `stored` that storageService.uploadObject
// passes through instead of uploading again.
export const claimUpload = async ({ userId, purpose, path }: { userId: string; purpose: UploadPurpose; path: unknown }): Promise<UploadedFile> => {
  const admin = ensureStorage();
  const spec = purposeSpec(purpose);
  // Only objects the API named for this user and purpose: <userId>/<prefix>-<ts>-<rand>.<ext>
  const shape = new RegExp(`^${escapeRegExp(userId)}/${escapeRegExp(spec.prefix)}-\\d+-\\d+\\.[a-z0-9]+$`);
  if (typeof path !== "string" || !shape.test(path)) throw publicFileError("Invalid upload reference");

  const storage = admin.storage.from(spec.bucket);
  const { data: info, error } = await storage.info(path);
  if (error || !info) throw publicFileError("Upload not found. Upload the file again.");

  const reject = async (message: string): Promise<never> => {
    await storage.remove([path]).catch(() => {});
    throw publicFileError(message);
  };

  const declared = String(info.contentType || (info.metadata as { mimetype?: string } | undefined)?.mimetype || "").toLowerCase();
  const size = Number(info.size);
  if (!Number.isInteger(size) || size <= 0) return reject("Uploaded file is empty or invalid");
  const limit = maxBytesFor(spec, declared);
  if (size > limit) return reject(`File is too large. Maximum size is ${limit / MB} MB.`);

  const head = await readHead(storage, path);
  if (!detectFileType(head) || !spec.mimeTypes.some((type) => contentMatchesType(head, type))) {
    return reject("Uploaded file content does not match an allowed file type");
  }
  const extension = extensionForMime(declared);
  if (!spec.mimeTypes.includes(declared) || !contentMatchesType(head, declared) || !extension || !path.endsWith(extension)) {
    return reject("Uploaded file content does not match its declared content type");
  }

  return {
    stored: true,
    bucket: spec.bucket,
    path,
    mimetype: declared,
    size,
    originalname: path.slice(path.lastIndexOf("/") + 1),
  };
};
