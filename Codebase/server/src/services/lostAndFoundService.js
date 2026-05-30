const {
  ensureSupabaseAdmin,
  mapProfile,
  profileSelect,
  publicUrl,
  uploadToBucket,
} = require("../utils/supabaseData");
const { sanitizePlainText } = require("../utils/validation");

const mapPost = (post) => ({
  id: post.id,
  userId: post.user_id,
  type: post.type,
  title: post.title,
  description: post.description,
  image: post.image_path,
  imageUrl: publicUrl(post.image_bucket, post.image_path),
  imageBucket: post.image_bucket,
  imageMimeType: post.image_mime_type,
  imageSizeBytes: post.image_size_bytes,
  location: post.location,
  contact: post.contact,
  status: post.status,
  createdAt: post.created_at,
  updatedAt: post.updated_at,
  user: mapProfile(post.user),
});

const allowedUpdateFields = (data) => {
  const payload = {};
  for (const field of ["type", "title", "description", "location", "contact", "status"]) {
    if (data[field] !== undefined) payload[field] = sanitizePlainText(data[field], { max: 3000 });
  }
  return payload;
};

class LostAndFoundService {
  async getAllPosts(filters = {}, { page = 1, limit = 20 } = {}) {
    const supabase = ensureSupabaseAdmin();
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    let query = supabase
      .from("lost_and_found_posts")
      .select(`*, user:profiles!lost_and_found_posts_user_id_fkey(${profileSelect})`, { count: "exact" });

    if (filters.type && filters.type !== "all") query = query.eq("type", filters.type);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.search) {
      const search = `%${filters.search}%`;
      query = query.or(`title.ilike.${search},description.ilike.${search},location.ilike.${search}`);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw error;
    return {
      posts: data.map(mapPost),
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  async getPostById(postId) {
    const supabase = ensureSupabaseAdmin();
    const { data, error } = await supabase
      .from("lost_and_found_posts")
      .select(`*, user:profiles!lost_and_found_posts_user_id_fkey(${profileSelect})`)
      .eq("id", Number(postId))
      .maybeSingle();

    if (error) throw error;
    return data ? mapPost(data) : null;
  }

  async createPost(userId, postData, imageFile = null) {
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
        image_path: image.path,
        image_bucket: image.bucket,
        image_mime_type: image.mimeType,
        image_size_bytes: image.size,
      })
      .select(`*, user:profiles!lost_and_found_posts_user_id_fkey(${profileSelect})`)
      .single();

    if (error) throw error;
    return mapPost(data);
  }

  async updatePost(postId, userId, updateData, imageFile = null) {
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
      .select(`*, user:profiles!lost_and_found_posts_user_id_fkey(${profileSelect})`)
      .single();

    if (error) throw error;
    return mapPost(data);
  }

  async deletePost(postId, userId) {
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

  async markAsResolved(postId, userId) {
    return this.updatePost(postId, userId, { status: "resolved" });
  }

  async markAsActive(postId, userId) {
    return this.updatePost(postId, userId, { status: "active" });
  }

  async getRawPost(postId) {
    const supabase = ensureSupabaseAdmin();
    const { data, error } = await supabase
      .from("lost_and_found_posts")
      .select("*")
      .eq("id", Number(postId))
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async disconnect() {}
}

module.exports = new LostAndFoundService();
