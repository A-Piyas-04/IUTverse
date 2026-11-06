import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin, isSupabaseAdminConfigured } from "../config/supabase";
import * as storageService from "../services/storageService";
import type { UploadedFile } from "../http/context";

export const ensureSupabaseAdmin = (): SupabaseClient => {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    throw new Error("Supabase Admin is not configured");
  }
  return supabaseAdmin;
};

export const pageRange = (page: unknown = 1, limit: unknown = 20, maxLimit = 100) => {
  const safePage = Math.max(parseInt(String(page), 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), maxLimit);
  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;
  return { page: safePage, limit: safeLimit, from, to };
};

export const profileSelect = "id, display_name, handle, batch, profile_image_path, cover_image_path, department:departments(id, name)";

export const publicUrl = (bucket?: string | null, objectPath?: string | null): string | null => {
  if (!bucket || !objectPath) return null;
  return storageService.publicUrl(bucket, objectPath);
};

// Post images are stored under the uploader's id, and the bucket is public, so
// the path of an anonymous post's image would name its author. Such images move
// to a neutral folder (anonymizePostImage); until then they are not shown.
export const postImagePath = (post: any): string | null => {
  if (!post?.image_path) return null;
  return post.is_anonymous && String(post.image_path).startsWith(`${post.author_id}/`) ? null : post.image_path;
};

export const postImageUrl = (post: any) => publicUrl(post?.image_bucket, postImagePath(post));

export const mapProfile = (profile: any) => {
  if (!profile) return null;

  return {
    id: profile.id,
    name: profile.display_name,
    displayName: profile.display_name,
    handle: profile.handle,
    batch: profile.batch,
    department: profile.department?.name || null,
    profilePictureUrl: publicUrl("avatars", profile.profile_image_path),
    profile: {
      profilePicture: profile.profile_image_path,
    },
  };
};

export const uploadToBucket = async ({
  bucket,
  userId,
  file,
  prefix,
}: {
  bucket: string;
  userId: string;
  file?: UploadedFile | null;
  prefix: string;
}) => {
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
