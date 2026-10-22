import { ApiError, apiRequest, jsonBody } from "./api";
import { supabase } from "./supabase";

// Must match UPLOAD_PURPOSES in src/server/services/uploadIntentService.ts.
export type UploadPurpose = "avatar" | "cover" | "post" | "lostFound" | "catPost" | "event" | "resource" | "chat";

interface UploadIntent { bucket: string; path: string; token: string }

/**
 * Uploads a file straight to Supabase Storage and returns the object path to
 * send as `uploadPath` to the route that uses it. Files never pass through the
 * API host, whose serverless body limit (about 4.5 MB) is below the upload
 * limits. The API names the path and re-validates the stored file on use.
 */
export async function uploadDirect(purpose: UploadPurpose, file: File, extra: { conversationId?: number } = {}): Promise<string> {
  if (!supabase.storage) throw new ApiError("Uploads are not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.", 500);
  const intent = await apiRequest<UploadIntent>("/uploads", { method: "POST", ...jsonBody({ purpose, mimeType: file.type, size: file.size, ...extra }) });
  const { bucket, path, token } = intent.data;
  const { error } = await supabase.storage.from(bucket).uploadToSignedUrl(path, token, file, { contentType: file.type });
  if (error) throw new ApiError(error.message || "Upload failed", 400);
  return path;
}
