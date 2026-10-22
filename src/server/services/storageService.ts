import "server-only";
import { supabaseAdmin, isSupabaseAdminConfigured } from "../config/supabase";
import config from "../config/config";
import { PublicError } from "../http/errors";
import type { UploadedFile } from "../http/context";
import { validateUploadedFile } from "../utils/fileValidation";

const trimSlash = (value: unknown) => String(value || "").replace(/\/+$/, "");

// Storage URLs given to browsers must use the browser-facing Supabase address.
export const browserUrl = <T extends string | null | undefined>(url: T): T | string => {
  const internal = trimSlash(config.supabase.url);
  const external = trimSlash(config.supabase.publicUrl);
  if (!url || !external || !internal || !url.startsWith(internal)) return url;
  return external + url.slice(internal.length);
};

const ensureStorage = () => {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    throw new Error("Supabase Storage is not configured");
  }
  return supabaseAdmin;
};

const safeSegment = (value: unknown, fallback = "upload") =>
  String(value || fallback)
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || fallback;

export const buildObjectPath = (userId: string, prefix = "upload", extension: string | null = "") => {
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  return `${safeSegment(userId, "anonymous")}/${safeSegment(prefix)}-${unique}${extension ?? ""}`;
};

export const uploadObject = async ({
  bucket,
  userId,
  file,
  prefix,
}: {
  bucket: string;
  userId: string;
  file: UploadedFile;
  prefix?: string;
}): Promise<{ bucket: string; path: string; mimeType: string; size: number }> => {
  const storage = ensureStorage();

  // Already uploaded straight to Storage and validated by claimUpload.
  if (file?.stored) {
    if (file.bucket !== bucket) {
      throw new PublicError("Upload does not belong to this destination", 400);
    }
    return { bucket, path: file.path as string, mimeType: file.mimetype, size: file.size };
  }

  const fileType = validateUploadedFile(file, { bucket });
  const objectPath = buildObjectPath(userId, prefix, fileType!.extension);
  const { error } = await storage.storage.from(bucket).upload(objectPath, file.buffer as Buffer, {
    contentType: fileType!.mimeType,
    upsert: false,
  });

  if (error) throw error;

  return {
    bucket,
    path: objectPath,
    mimeType: fileType!.mimeType,
    size: file.size,
  };
};

export const removeObject = async ({ bucket, objectPath }: { bucket?: string | null; objectPath?: string | null }) => {
  const storage = ensureStorage();
  if (!bucket || !objectPath) return;

  const { error } = await storage.storage.from(bucket).remove([objectPath]);
  if (error) throw error;
};

export const publicUrl = (bucket?: string | null, objectPath?: string | null): string | null => {
  const storage = ensureStorage();
  if (!bucket || !objectPath) return null;

  const { data } = storage.storage.from(bucket).getPublicUrl(objectPath);
  return browserUrl(data.publicUrl) as string;
};

export const signedUrl = async (bucket?: string | null, objectPath?: string | null, expiresIn = 300): Promise<string | null> => {
  const storage = ensureStorage();
  if (!bucket || !objectPath) return null;
  const { data, error } = await storage.storage.from(bucket).createSignedUrl(objectPath, expiresIn);
  if (error) throw error;
  return browserUrl(data.signedUrl) as string;
};
