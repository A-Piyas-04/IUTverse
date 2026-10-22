import "server-only";
import type { UploadedFile } from "../http/context";
import { ensureSupabaseAdmin, mapProfile, profileSelect, publicUrl, uploadToBucket } from "../utils/supabaseData";
import { filterSearchTerm, sanitizePlainText } from "../utils/validation";

const mapPost = (post: any) => ({
  id: post.id,
  userId: post.user_id as string | null,
  type: post.type,
  title: post.title,
  description: post.description,
  image: post.image_path,
  imageUrl: publicUrl(post.image_bucket, post.image_path),
  imageBucket: post.image_bucket,
  imageMimeType: post.image_mime_type,
  imageSizeBytes: post.image_size_bytes,
  location: post.location,
  contact: post.contact as string | null,
  category: post.category,
  occurredAt: post.occurred_at,
  contactPreference: post.contact_preference,
  contactNote: post.contact_note as string | null,
  returnLocation: post.return_location,
  availability: post.availability,
  privacyAccepted: post.privacy_accepted,
  status: post.status as string,
  createdAt: post.created_at,
  updatedAt: post.updated_at,
  user: mapProfile(post.user) as ReturnType<typeof mapProfile> | null,
});

export type LostFoundDto = ReturnType<typeof mapPost>;

const allowedUpdateFields = (data: Record<string, any>) => {
  const payload: Record<string, unknown> = {};
  const fieldMap: Record<string, string> = { type: "type", title: "title", description: "description", location: "location", contact: "contact", category: "category", occurredAt: "occurred_at", contactPreference: "contact_preference", contactNote: "contact_note", returnLocation: "return_location", availability: "availability", privacyAccepted: "privacy_accepted" };
  for (const [field, column] of Object.entries(fieldMap)) {
    if (data[field] !== undefined) payload[column] = typeof data[field] === "string" ? sanitizePlainText(data[field], { max: 3000 }) : data[field];
  }
  return payload;
};

const userSelect = `*, user:profiles!lost_and_found_posts_user_id_fkey(${profileSelect})`;

class LostAndFoundService {
  async getAllPosts(filters: { type?: string; status?: string; search?: string | null } = {}, { page = 1, limit = 20 }: { page?: number; limit?: number } = {}) {
    const supabase = ensureSupabaseAdmin();
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    let query = supabase
      .from("lost_and_found_posts")
      .select(userSelect, { count: "exact" });

    if (filters.type && filters.type !== "all") query = query.eq("type", filters.type);
    if (filters.status) query = query.eq("status", filters.status);
    if (filterSearchTerm(filters.search)) {
      const search = `%${filterSearchTerm(filters.search)}%`;
      query = query.or(`title.ilike.${search},description.ilike.${search},location.ilike.${search}`);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw error;
    return {
      posts: (data as any[]).map(mapPost),
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  async getPostById(postId: number) {
    const supabase = ensureSupabaseAdmin();
    const { data, error } = await supabase
      .from("lost_and_found_posts")
      .select(userSelect)
      .eq("id", Number(postId))
      .maybeSingle();

    if (error) throw error;
    return data ? mapPost(data) : null;
  }

  async createPost(userId: string, postData: Record<string, any>, imageFile: UploadedFile | null = null) {
    const supabase = ensureSupabaseAdmin();
    const image = await uploadToBucket({
      bucket: "lost-found",
      userId,
      file: imageFile,
      prefix: "item",
    });

    const { data, error } = await supabase
      .from("lost_and_found_posts")
      .insert({
        user_id: userId,
        type: postData.type,
        title: sanitizePlainText(postData.title, { max: 160 }),
        description: sanitizePlainText(postData.description, { max: 3000 }),
        location: sanitizePlainText(postData.location, { max: 200 }),
        contact: sanitizePlainText(postData.contact, { max: 200 }),
        category: postData.category,
        occurred_at: postData.occurredAt,
        contact_preference: postData.contactPreference || "message",
        contact_note: postData.contactNote,
        return_location: postData.returnLocation,
        availability: postData.availability,
        privacy_accepted: Boolean(postData.privacyAccepted),
        image_path: image.path,
        image_bucket: image.bucket,
        image_mime_type: image.mimeType,
        image_size_bytes: image.size,
      })
      .select(userSelect)
      .single();

    if (error) throw error;
    return mapPost(data);
  }

  async updatePost(postId: number, userId: string, updateData: Record<string, any>, imageFile: UploadedFile | null = null) {
    const supabase = ensureSupabaseAdmin();
    const existing = await this.getRawPost(postId);
    if (!existing) throw new Error("Post not found");
    if (existing.user_id !== userId) throw new Error("Unauthorized to update this post");

    const payload = allowedUpdateFields(updateData);
    if (imageFile) {
      const image = await uploadToBucket({
        bucket: "lost-found",
        userId,
        file: imageFile,
        prefix: "item",
      });
      payload.image_path = image.path;
      payload.image_bucket = image.bucket;
      payload.image_mime_type = image.mimeType;
      payload.image_size_bytes = image.size;
    }

    const { data, error } = await supabase
      .from("lost_and_found_posts")
      .update(payload)
      .eq("id", Number(postId))
      .select(userSelect)
      .single();

    if (error) throw error;
    return mapPost(data);
  }

  async deletePost(postId: number, userId: string) {
    const supabase = ensureSupabaseAdmin();
    const existing = await this.getRawPost(postId);
    if (!existing) throw new Error("Post not found");
    if (existing.user_id !== userId) throw new Error("Unauthorized to delete this post");

    const { error } = await supabase
      .from("lost_and_found_posts")
      .delete()
      .eq("id", Number(postId));

    if (error) throw error;
    return { message: "Post deleted successfully" };
  }

  // Owners may only toggle between active and resolved. Archived, flagged and
  // deleted are moderation states and cannot be left from here.
  async transitionStatus(postId: number, userId: string, from: string, to: string) {
    const supabase = ensureSupabaseAdmin();
    const existing = await this.getRawPost(postId);
    if (!existing) throw new Error("Post not found");
    if (existing.user_id !== userId) throw new Error("Unauthorized to update this post");
    if (existing.status !== from) throw new Error(`Only ${from} posts can be marked ${to}`);

    const { data, error } = await supabase
      .from("lost_and_found_posts")
      .update({ status: to })
      .eq("id", Number(postId))
      .eq("status", from)
      .select(userSelect)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error(`Only ${from} posts can be marked ${to}`);
    return mapPost(data);
  }

  async markAsResolved(postId: number, userId: string) {
    return this.transitionStatus(postId, userId, "active", "resolved");
  }

  async markAsActive(postId: number, userId: string) {
    return this.transitionStatus(postId, userId, "resolved", "active");
  }

  async getRawPost(postId: number) {
    const supabase = ensureSupabaseAdmin();
    const { data, error } = await supabase
      .from("lost_and_found_posts")
      .select("*")
      .eq("id", Number(postId))
      .maybeSingle();

    if (error) throw error;
    return data;
  }
}

const lostAndFoundService = new LostAndFoundService();
export default lostAndFoundService;
