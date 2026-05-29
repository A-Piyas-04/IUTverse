const {
  ensureSupabaseAdmin,
  mapProfile,
  pageRange,
  profileSelect,
  publicUrl,
  uploadToBucket,
} = require("../utils/supabaseData");
const { badRequest, forbidden, notFound, serverError } = require("../utils/responses");
const { optionalText, positiveInt, requiredText } = require("../utils/validation");

const mapReaction = (reaction) => ({
  id: reaction.id,
  postId: reaction.post_id,
  userId: reaction.user_id,
  reactionType: reaction.reaction_type,
  user: mapProfile(reaction.user),
});

const mapComment = (comment) => ({
  id: comment.id,
  postId: comment.post_id,
  userId: comment.author_id,
  content: comment.content,
  createdAt: comment.created_at,
  updatedAt: comment.updated_at,
  parentCommentId: comment.parent_comment_id,
  user: mapProfile(comment.user),
  replies: (comment.replies || []).map(mapComment),
  _count: { replies: comment.replies?.length || 0 },
});

const mapPost = (post) => ({
  id: post.id,
  userId: post.author_id,
  content: post.content,
  category: post.categories?.[0]?.category?.name || null,
  isAnonymous: post.is_anonymous,
  createdAt: post.created_at,
  updatedAt: post.updated_at,
  image: post.image_path,
  imageUrl: publicUrl(post.image_bucket, post.image_path),
  likesCount: post.reaction_count,
  commentCount: post.comment_count,
  user: mapProfile(post.user),
  tags: (post.categories || []).map((link) => ({ tag: link.category })),
  reactions: (post.reactions || []).map(mapReaction),
  comments: (post.comments || []).map(mapComment),
  _count: {
    comments: post.comment_count,
    reactions: post.reaction_count,
  },
});

const allowedPostReactions = new Set(["like", "funny", "relatable", "angry", "insightful", "helpful", "wholesome"]);

const hydratePost = async (post, commentLimit = 3) => {
  const supabase = ensureSupabaseAdmin();
  const [categories, reactions, comments] = await Promise.all([
    supabase
      .from("post_category_links")
      .select("category:post_categories(id, name)")
      .eq("post_id", post.id),
    supabase
      .from("post_reactions")
      .select(`*, user:profiles!post_reactions_user_id_fkey(${profileSelect})`)
      .eq("post_id", post.id),
    supabase
      .from("post_comments")
      .select(`*, user:profiles!post_comments_author_id_fkey(${profileSelect})`)
      .eq("post_id", post.id)
      .is("parent_comment_id", null)
      .order("created_at", { ascending: false })
      .limit(commentLimit),
  ]);

  if (categories.error) throw categories.error;
  if (reactions.error) throw reactions.error;
  if (comments.error) throw comments.error;

  return mapPost({
    ...post,
    categories: categories.data,
    reactions: reactions.data,
    comments: comments.data,
  });
};

const attachCategory = async (postId, categoryName) => {
  if (!categoryName) return;
  const supabase = ensureSupabaseAdmin();
  const { data: category, error } = await supabase
    .from("post_categories")
    .upsert({ name: categoryName }, { onConflict: "name" })
    .select("*")
    .single();
  if (error) throw error;

  const { error: linkError } = await supabase
    .from("post_category_links")
    .upsert({ post_id: postId, category_id: category.id }, { onConflict: "post_id,category_id" });
  if (linkError) throw linkError;
};

const getCategoryPostIds = async (category) => {
  if (!category) return null;

  const supabase = ensureSupabaseAdmin();
  const { data: links, error } = await supabase
    .from("post_category_links")
    .select("post_id, category:post_categories!inner(name)")
    .eq("category.name", category);

  if (error) throw error;
  return links.map((link) => link.post_id);
};

const respondWithPosts = async (res, query, page, limit, emptyTotal = 0) => {
  const { data, count, error } = await query;
  if (error) throw error;

  const posts = await Promise.all((data || []).map((post) => hydratePost(post)));
  return res.status(200).json({
    success: true,
    data: posts,
    pagination: {
      page,
      limit,
      totalPosts: count ?? emptyTotal,
      totalPages: Math.ceil((count ?? emptyTotal) / limit),
    },
  });
};

exports.createPost = async (req, res) => {
  try {
    const contentResult = requiredText(req.body.content, "Post content", { max: 5000 });
    if (contentResult.error) return badRequest(res, contentResult.error);

    const category = optionalText(req.body.category, { max: 80 });
    const isAnonymous = req.body.isAnonymous;
    const userId = req.user.id;
    const image = await uploadToBucket({
      bucket: "post-media",
      userId,
      file: req.file,
      prefix: "post",
    });

    const supabase = ensureSupabaseAdmin();
    const { data: post, error } = await supabase
      .from("posts")
      .insert({
        author_id: userId,
        content: contentResult.value,
        is_anonymous: isAnonymous === "true" || isAnonymous === true,
        image_path: image.path,
        image_bucket: image.bucket,
        image_mime_type: image.mimeType,
        image_size_bytes: image.size,
      })
      .select(`*, user:profiles!posts_author_id_fkey(${profileSelect})`)
      .single();

    if (error) throw error;
    await attachCategory(post.id, category);

    return res.status(201).json({ success: true, data: await hydratePost(post) });
  } catch (error) {
    console.error("Error creating post:", error);
    return serverError(res, "Failed to create post", error.message);
  }
};

exports.getPosts = async (req, res) => {
  try {
    const { page, limit, from, to } = pageRange(req.query.page || 1, req.query.limit || 10);
    const category = req.query.category;
    const supabase = ensureSupabaseAdmin();

    const idsFilter = await getCategoryPostIds(category);
    if (idsFilter) {
      if (!idsFilter.length) {
        return res.status(200).json({
          success: true,
          data: [],
          pagination: { page, limit, totalPosts: 0, totalPages: 0 },
        });
      }
    }

    let query = supabase
      .from("posts")
      .select(`*, user:profiles!posts_author_id_fkey(${profileSelect})`, { count: "exact" })
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .range(from, to);
    if (idsFilter) query = query.in("id", idsFilter);

    return respondWithPosts(res, query, page, limit);
  } catch (error) {
    console.error("Error fetching posts:", error);
    return serverError(res, "Failed to fetch posts", error.message);
  }
};

exports.getPost = async (req, res) => {
  try {
    const supabase = ensureSupabaseAdmin();
    const idResult = positiveInt(req.params.id, "Post ID");
    if (idResult.error) return badRequest(res, idResult.error);

    const { data: post, error } = await supabase
      .from("posts")
      .select(`*, user:profiles!posts_author_id_fkey(${profileSelect})`)
      .eq("id", idResult.value)
      .maybeSingle();
    if (error) throw error;
    if (!post) return notFound(res, "Post not found");
    return res.status(200).json({ success: true, data: await hydratePost(post, 100) });
  } catch (error) {
    console.error("Error fetching post:", error);
    return serverError(res, "Failed to fetch post", error.message);
  }
};

exports.updatePost = async (req, res) => {
  try {
    const supabase = ensureSupabaseAdmin();
    const idResult = positiveInt(req.params.id, "Post ID");
    if (idResult.error) return badRequest(res, idResult.error);

    const postId = idResult.value;
    const userId = req.user.id;
    const { data: existing, error: findError } = await supabase
      .from("posts")
      .select("*")
      .eq("id", postId)
      .maybeSingle();

    if (findError) throw findError;
    if (!existing) return notFound(res, "Post not found");
    if (existing.author_id !== userId) {
      return forbidden(res, "You are not authorized to update this post");
    }

    const payload = {};
    if (req.body.content !== undefined) {
      const contentResult = requiredText(req.body.content, "Post content", { max: 5000 });
      if (contentResult.error) return badRequest(res, contentResult.error);
      payload.content = contentResult.value;
    }
    if (req.body.isAnonymous !== undefined) payload.is_anonymous = req.body.isAnonymous === "true" || req.body.isAnonymous === true;
    if (req.file) {
      const image = await uploadToBucket({ bucket: "post-media", userId, file: req.file, prefix: "post" });
      payload.image_path = image.path;
      payload.image_bucket = image.bucket;
      payload.image_mime_type = image.mimeType;
      payload.image_size_bytes = image.size;
    }

    const { data: post, error } = await supabase
      .from("posts")
      .update(payload)
      .eq("id", postId)
      .select(`*, user:profiles!posts_author_id_fkey(${profileSelect})`)
      .single();

    if (error) throw error;
    if (req.body.category) await attachCategory(post.id, optionalText(req.body.category, { max: 80 }));
    return res.status(200).json({ success: true, data: await hydratePost(post) });
  } catch (error) {
    console.error("Error updating post:", error);
    return serverError(res, "Failed to update post", error.message);
  }
};

exports.deletePost = async (req, res) => {
  try {
    const supabase = ensureSupabaseAdmin();
    const idResult = positiveInt(req.params.id, "Post ID");
    if (idResult.error) return badRequest(res, idResult.error);

    const postId = idResult.value;
    const userId = req.user.id;
    const { data: existing, error: findError } = await supabase
      .from("posts")
      .select("*")
      .eq("id", postId)
      .maybeSingle();

    if (findError) throw findError;
    if (!existing) return notFound(res, "Post not found");
    if (existing.author_id !== userId) {
      return forbidden(res, "You are not authorized to delete this post");
    }

    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) throw error;
    return res.status(200).json({ success: true, message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error deleting post:", error);
    return serverError(res, "Failed to delete post", error.message);
  }
};

exports.reactToPost = async (req, res) => {
  try {
    const supabase = ensureSupabaseAdmin();
    const idResult = positiveInt(req.params.id, "Post ID");
    if (idResult.error) return badRequest(res, idResult.error);

    const postId = idResult.value;
    const userId = req.user.id;
    const reactionType = String(req.body.reactionType || "").toLowerCase();

    if (!allowedPostReactions.has(reactionType)) {
      return badRequest(res, `reactionType must be one of: ${[...allowedPostReactions].join(", ")}`);
    }

    const { data: existing, error: findError } = await supabase
      .from("post_reactions")
      .select("*")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .maybeSingle();
    if (findError) throw findError;

    let action;
    if (existing?.reaction_type === reactionType) {
      const { error } = await supabase.from("post_reactions").delete().eq("id", existing.id);
      if (error) throw error;
      action = "removed";
    } else {
      const { error } = await supabase
        .from("post_reactions")
        .upsert(
          { post_id: postId, user_id: userId, reaction_type: reactionType },
          { onConflict: "post_id,user_id" }
        );
      if (error) throw error;
      action = existing ? "updated" : "added";
    }

    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("reaction_count")
      .eq("id", postId)
      .maybeSingle();
    if (postError) throw postError;

    return res.status(action === "added" ? 201 : 200).json({
      success: true,
      message: `Reaction ${action}`,
      action,
      reactionCount: post?.reaction_count || 0,
    });
  } catch (error) {
    console.error("Error handling post reaction:", error);
    return serverError(res, "Failed to process reaction", error.message);
  }
};

exports.getUserFeed = async (req, res) => {
  try {
    const { page, limit, from, to } = pageRange(req.query.page || 1, req.query.limit || 10);
    const supabase = ensureSupabaseAdmin();
    const userId = req.user.id;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("department_id, batch")
      .eq("id", userId)
      .maybeSingle();
    if (profileError) throw profileError;

    if (!profile?.department_id && !profile?.batch) {
      req.query.category = req.query.category || undefined;
      return exports.getPosts(req, res);
    }

    let profileQuery = supabase.from("profiles").select("id");
    if (profile.department_id) profileQuery = profileQuery.eq("department_id", profile.department_id);
    if (profile.batch) profileQuery = profileQuery.eq("batch", profile.batch);

    const { data: matchingProfiles, error: matchingError } = await profileQuery;
    if (matchingError) throw matchingError;

    const authorIds = (matchingProfiles || []).map((matchingProfile) => matchingProfile.id);
    if (!authorIds.length) {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: { page, limit, totalPosts: 0, totalPages: 0 },
      });
    }

    const categoryIds = await getCategoryPostIds(req.query.category);
    if (categoryIds && !categoryIds.length) {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: { page, limit, totalPosts: 0, totalPages: 0 },
      });
    }

    let query = supabase
      .from("posts")
      .select(`*, user:profiles!posts_author_id_fkey(${profileSelect})`, { count: "exact" })
      .eq("status", "active")
      .in("author_id", authorIds)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (categoryIds) query = query.in("id", categoryIds);

    return respondWithPosts(res, query, page, limit);
  } catch (error) {
    console.error("Error fetching user feed:", error);
    return serverError(res, "Failed to fetch user feed", error.message);
  }
};
