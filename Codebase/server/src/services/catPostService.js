const {
  ensureSupabaseAdmin,
  mapProfile,
  pageRange,
  profileSelect,
  publicUrl,
  uploadToBucket,
} = require("../utils/supabaseData");
const { sanitizePlainText } = require("../utils/validation");

const mapPost = (post) => ({
  id: post.id,
  userId: post.user_id,
  caption: post.caption,
  category: post.category,
  location: post.location,
  image: post.image_path,
  imageUrl: publicUrl(post.image_bucket, post.image_path),
  imageBucket: post.image_bucket,
  likeCount: post.like_count,
  createdAt: post.created_at,
  updatedAt: post.updated_at,
  user: mapProfile(post.user),
  likes: post.likes || [],
  comments: (post.comments || []).map((comment) => ({
    id: comment.id,
    userId: comment.user_id,
    catPostId: comment.cat_post_id,
    content: comment.content,
    createdAt: comment.created_at,
    updatedAt: comment.updated_at,
    user: mapProfile(comment.user),
  })),
});

class CatPostService {
  async createPost(userId, caption, imageFile, details = {}) {
    const supabase = ensureSupabaseAdmin();
    const image = await uploadToBucket({
      bucket: "cat-posts",
      userId,
      file: imageFile,
      prefix: "cat-post",
    });

    const { data, error } = await supabase
      .from("cat_posts")
      .insert({
        user_id: userId,
        caption: sanitizePlainText(caption, { max: 1000 }),
        category: sanitizePlainText(details.category || "Update", { max: 60 }),
        location: details.location ? sanitizePlainText(details.location, { max: 200 }) : null,
        image_path: image.path,
        image_bucket: image.bucket,
        image_mime_type: image.mimeType,
        image_size_bytes: image.size,
      })
      .select(`*, user:profiles!cat_posts_user_id_fkey(${profileSelect})`)
      .single();

    if (error) throw error;
    return mapPost(data);
  }

  async getAllPosts(page = 1, limit = 10, category = null) {
    const supabase = ensureSupabaseAdmin();
    const range = pageRange(page, limit);
    let query = supabase
      .from("cat_posts")
      .select(`*, user:profiles!cat_posts_user_id_fkey(${profileSelect})`, { count: "exact" })
      .eq("status", "active");
    if (category && category !== "All") query = query.eq("category", sanitizePlainText(category, { max: 60 }));
    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(range.from, range.to);

    if (error) throw error;

    const posts = await Promise.all(data.map((post) => this.withComments(post)));
    return {
      posts,
      pagination: {
        page: range.page,
        limit: range.limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / range.limit),
      },
    };
  }

  async toggleLike(userId, postId) {
    const supabase = ensureSupabaseAdmin();
    const { data: existing, error: findError } = await supabase
      .from("cat_post_likes")
      .select("id")
      .eq("user_id", userId)
      .eq("cat_post_id", Number(postId))
      .maybeSingle();

    if (findError) throw findError;

    if (existing) {
      const { error } = await supabase
        .from("cat_post_likes")
        .delete()
        .eq("id", existing.id);
      if (error) throw error;
      await this.recountLikes(postId);
      return { liked: false };
    }

    const { error } = await supabase
      .from("cat_post_likes")
      .insert({ user_id: userId, cat_post_id: Number(postId) });

    if (error) throw error;
    await this.recountLikes(postId);
    return { liked: true };
  }

  async addComment(userId, postId, content) {
    const supabase = ensureSupabaseAdmin();
    const { data, error } = await supabase
      .from("cat_post_comments")
      .insert({
        user_id: userId,
        cat_post_id: Number(postId),
        content: sanitizePlainText(content, { max: 1000 }),
      })
      .select(`*, user:profiles!cat_post_comments_user_id_fkey(${profileSelect})`)
      .single();

    if (error) throw error;
    return {
      id: data.id,
      userId: data.user_id,
      catPostId: data.cat_post_id,
      content: data.content,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      user: mapProfile(data.user),
    };
  }

  async getPostById(postId) {
    const supabase = ensureSupabaseAdmin();
    const { data, error } = await supabase
      .from("cat_posts")
      .select(`*, user:profiles!cat_posts_user_id_fkey(${profileSelect})`)
      .eq("id", Number(postId))
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Post not found");
    return this.withComments(data);
  }

  async deletePost(userId, postId) {
    const supabase = ensureSupabaseAdmin();
    const { data: post, error: findError } = await supabase
      .from("cat_posts")
      .select("*")
      .eq("id", Number(postId))
      .maybeSingle();

    if (findError) throw findError;
    if (!post) throw new Error("Post not found");
    if (post.user_id !== userId) throw new Error("Unauthorized to delete this post");

    const { error } = await supabase
      .from("cat_posts")
      .delete()
      .eq("id", Number(postId));

    if (error) throw error;
    return { success: true };
  }

  async withComments(post, { commentLimit = 20 } = {}) {
    const supabase = ensureSupabaseAdmin();
    const { data: comments, error } = await supabase
      .from("cat_post_comments")
      .select(`*, user:profiles!cat_post_comments_user_id_fkey(${profileSelect})`)
      .eq("cat_post_id", post.id)
      .order("created_at", { ascending: false })
      .limit(commentLimit);

    if (error) throw error;

    const { count: likeCount, error: likesError } = await supabase
      .from("cat_post_likes")
      .select("id", { count: "exact", head: true })
      .eq("cat_post_id", post.id);

    if (likesError) throw likesError;
    return mapPost({ ...post, comments, likes: [], like_count: likeCount ?? post.like_count });
  }

  async recountLikes(postId) {
    const supabase = ensureSupabaseAdmin();
    const { count, error } = await supabase
      .from("cat_post_likes")
      .select("id", { count: "exact", head: true })
      .eq("cat_post_id", Number(postId));
    if (error) throw error;
    await supabase.from("cat_posts").update({ like_count: count || 0 }).eq("id", Number(postId));
  }
}

module.exports = new CatPostService();
