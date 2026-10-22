import "server-only";
import type { Handler } from "../http/context";
import { badRequest, forbidden, json, notFound, serverError } from "../http/responses";
import logger from "../utils/logger";
import { ensureSupabaseAdmin, mapProfile, pageRange, profileSelect, publicUrl, uploadToBucket } from "../utils/supabaseData";
import { optionalText, positiveInt, requiredText } from "../utils/validation";
import { canViewContent } from "../utils/contentVisibility";

const mapReaction = (reaction: any) => ({
  id: reaction.id,
  postId: reaction.post_id,
  userId: reaction.user_id,
  reactionType: reaction.reaction_type as string,
  user: mapProfile(reaction.user),
});

interface CommentDto {
  id: number;
  postId: number;
  userId: string | null;
  authorId: string | null;
  isAnonymous: boolean;
  content: string;
  createdAt: string;
  updatedAt: string;
  parentCommentId: number | null;
  user: ReturnType<typeof mapProfile>;
  replies: CommentDto[];
  _count: { replies: number };
}

const mapComment = (comment: any): CommentDto => ({
  id: comment.id,
  postId: comment.post_id,
  userId: comment.is_anonymous ? null : comment.author_id,
  authorId: comment.is_anonymous ? null : comment.author_id,
  isAnonymous: Boolean(comment.is_anonymous),
  content: comment.content,
  createdAt: comment.created_at,
  updatedAt: comment.updated_at,
  parentCommentId: comment.parent_comment_id,
  user: comment.is_anonymous ? null : mapProfile(comment.user),
  replies: (comment.replies || []).map(mapComment),
  _count: { replies: comment.replies?.length || 0 },
});

const emptyReactionSummary = (): Record<string, number> => ({ like: 0, funny: 0, relatable: 0, angry: 0, insightful: 0, helpful: 0, wholesome: 0 });

const mapPost = (post: any, currentUserId: string | null = null) => {
  const anonymous = Boolean(post.is_anonymous);
  const reactions = (post.reactions || []).map(mapReaction);
  const reactionSummary = reactions.reduce((summary: Record<string, number>, reaction: { reactionType: string }) => {
    if (Object.prototype.hasOwnProperty.call(summary, reaction.reactionType)) summary[reaction.reactionType] += 1;
    return summary;
  }, emptyReactionSummary());
  return ({
    id: post.id,
    userId: anonymous ? null : post.author_id,
    authorId: anonymous ? null : post.author_id,
    content: post.content,
    category: post.categories?.[0]?.category?.name || null,
    isAnonymous: post.is_anonymous,
    createdAt: post.created_at,
    updatedAt: post.updated_at,
    image: post.image_path,
    imageUrl: publicUrl(post.image_bucket, post.image_path),
    likesCount: post.reaction_count,
    reactionCount: Number(post.reaction_count) || reactions.length,
    reactionSummary,
    currentReaction: reactions.find((reaction: { userId: string }) => reaction.userId === currentUserId)?.reactionType || null,
    commentCount: post.comment_count,
    user: anonymous ? null : mapProfile(post.user),
    tags: (post.categories || []).map((link: any) => ({ tag: link.category })),
    reactions,
    comments: (post.comments || []).map(mapComment),
    _count: {
      comments: post.comment_count,
      reactions: post.reaction_count,
    },
  });
};

const allowedPostReactions = new Set(["like", "funny", "relatable", "angry", "insightful", "helpful", "wholesome"]);

const postSelect = `*, user:profiles!posts_author_id_fkey(${profileSelect})`;

const hydratePost = async (post: any, commentLimit = 3, currentUserId: string | null = null) => {
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
      .eq("status", "active")
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
  }, currentUserId);
};

const attachCategory = async (postId: number, categoryName: string | null) => {
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

const getCategoryPostIds = async (category: unknown): Promise<number[] | null> => {
  if (!category) return null;

  const supabase = ensureSupabaseAdmin();
  const { data: links, error } = await supabase
    .from("post_category_links")
    .select("post_id, category:post_categories!inner(name)")
    .eq("category.name", category)
    .limit(1000);

  if (error) throw error;
  return (links as any[]).map((link) => link.post_id);
};

const respondWithPosts = async (query: PromiseLike<{ data: any; count: number | null; error: any }>, page: number, limit: number, emptyTotal = 0, currentUserId: string | null = null) => {
  const { data, count, error } = await query;
  if (error) throw error;

  const posts = await Promise.all((data || []).map((post: any) => hydratePost(post, 3, currentUserId)));
  return json(200, {
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

const emptyPage = (page: number, limit: number) =>
  json(200, { success: true, data: [], pagination: { page, limit, totalPosts: 0, totalPages: 0 } });

export const createPost: Handler = async (ctx) => {
  try {
    const hasImage = Boolean(ctx.file);
    const content = optionalText(ctx.body.content, { max: 5000 });
    if (!content && !hasImage) {
      return badRequest("Post content or image is required");
    }

    const category = optionalText(ctx.body.category, { max: 80 });
    const isAnonymous = ctx.body.isAnonymous;
    const userId = ctx.user!.id;
    const image = await uploadToBucket({
      bucket: "post-media",
      userId,
      file: ctx.file,
      prefix: "post",
    });

    const supabase = ensureSupabaseAdmin();
    const { data: post, error } = await supabase
      .from("posts")
      .insert({
        author_id: userId,
        content: content || "",
        is_anonymous: isAnonymous === "true" || isAnonymous === true,
        image_path: image.path,
        image_bucket: image.bucket,
        image_mime_type: image.mimeType,
        image_size_bytes: image.size,
      })
      .select(postSelect)
      .single();

    if (error) throw error;
    await attachCategory(post.id, category);

    return json(201, { success: true, data: await hydratePost(post, 3, userId) });
  } catch (error: any) {
    logger.error("Error creating post:", error);
    return serverError("Failed to create post", error.message);
  }
};

export const getPosts: Handler = async (ctx) => {
  try {
    const { page, limit, from, to } = pageRange(ctx.query.page || 1, ctx.query.limit || 10);
    const category = ctx.query.category;
    const supabase = ensureSupabaseAdmin();

    const idsFilter = await getCategoryPostIds(category);
    if (idsFilter && !idsFilter.length) return emptyPage(page, limit);

    let query = supabase
      .from("posts")
      .select(postSelect, { count: "exact" })
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .range(from, to);
    if (idsFilter) query = query.in("id", idsFilter);

    return await respondWithPosts(query, page, limit, 0, ctx.user?.id || null);
  } catch (error: any) {
    logger.error("Error fetching posts:", error);
    return serverError("Failed to fetch posts", error.message);
  }
};

export const getPost: Handler = async (ctx) => {
  try {
    const supabase = ensureSupabaseAdmin();
    const idResult = positiveInt(ctx.params.id, "Post ID");
    if (!idResult.ok) return badRequest(idResult.error);

    const { data: post, error } = await supabase
      .from("posts")
      .select(postSelect)
      .eq("id", idResult.value)
      .maybeSingle();
    if (error) throw error;
    if (!post || !canViewContent({ status: post.status, ownerId: post.author_id, viewer: ctx.user })) return notFound("Post not found");
    return json(200, { success: true, data: await hydratePost(post, 100, ctx.user?.id || null) });
  } catch (error: any) {
    logger.error("Error fetching post:", error);
    return serverError("Failed to fetch post", error.message);
  }
};

export const updatePost: Handler = async (ctx) => {
  try {
    const supabase = ensureSupabaseAdmin();
    const idResult = positiveInt(ctx.params.id, "Post ID");
    if (!idResult.ok) return badRequest(idResult.error);

    const postId = idResult.value;
    const userId = ctx.user!.id;
    const { data: existing, error: findError } = await supabase
      .from("posts")
      .select("*")
      .eq("id", postId)
      .maybeSingle();

    if (findError) throw findError;
    if (!existing) return notFound("Post not found");
    if (existing.author_id !== userId) {
      return forbidden("You are not authorized to update this post");
    }

    const payload: Record<string, unknown> = {};
    if (ctx.body.content !== undefined) {
      const contentResult = requiredText(ctx.body.content, "Post content", { max: 5000 });
      if (!contentResult.ok) return badRequest(contentResult.error);
      payload.content = contentResult.value;
    }
    if (ctx.body.isAnonymous !== undefined) payload.is_anonymous = ctx.body.isAnonymous === "true" || ctx.body.isAnonymous === true;
    if (ctx.file) {
      const image = await uploadToBucket({ bucket: "post-media", userId, file: ctx.file, prefix: "post" });
      payload.image_path = image.path;
      payload.image_bucket = image.bucket;
      payload.image_mime_type = image.mimeType;
      payload.image_size_bytes = image.size;
    }

    const { data: post, error } = await supabase
      .from("posts")
      .update(payload)
      .eq("id", postId)
      .select(postSelect)
      .single();

    if (error) throw error;
    if (ctx.body.category) await attachCategory(post.id, optionalText(ctx.body.category, { max: 80 }));
    return json(200, { success: true, data: await hydratePost(post, 3, userId) });
  } catch (error: any) {
    logger.error("Error updating post:", error);
    return serverError("Failed to update post", error.message);
  }
};

export const deletePost: Handler = async (ctx) => {
  try {
    const supabase = ensureSupabaseAdmin();
    const idResult = positiveInt(ctx.params.id, "Post ID");
    if (!idResult.ok) return badRequest(idResult.error);

    const postId = idResult.value;
    const userId = ctx.user!.id;
    const { data: existing, error: findError } = await supabase
      .from("posts")
      .select("*")
      .eq("id", postId)
      .maybeSingle();

    if (findError) throw findError;
    if (!existing) return notFound("Post not found");
    if (existing.author_id !== userId) {
      return forbidden("You are not authorized to delete this post");
    }

    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) throw error;
    return json(200, { success: true, message: "Post deleted successfully" });
  } catch (error: any) {
    logger.error("Error deleting post:", error);
    return serverError("Failed to delete post", error.message);
  }
};

export const reactToPost: Handler = async (ctx) => {
  try {
    const supabase = ensureSupabaseAdmin();
    const idResult = positiveInt(ctx.params.id, "Post ID");
    if (!idResult.ok) return badRequest(idResult.error);

    const postId = idResult.value;
    const userId = ctx.user!.id;
    const reactionType = String(ctx.body.reactionType || "").toLowerCase();

    if (!allowedPostReactions.has(reactionType)) {
      return badRequest(`reactionType must be one of: ${[...allowedPostReactions].join(", ")}`);
    }

    const { data: existing, error: findError } = await supabase
      .from("post_reactions")
      .select("*")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .maybeSingle();
    if (findError) throw findError;

    let action: string;
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

    return json(action === "added" ? 201 : 200, {
      success: true,
      message: `Reaction ${action}`,
      action,
      reactionCount: post?.reaction_count || 0,
    });
  } catch (error: any) {
    logger.error("Error handling post reaction:", error);
    return serverError("Failed to process reaction", error.message);
  }
};

export const getUserFeed: Handler = async (ctx) => {
  try {
    const { page, limit, from, to } = pageRange(ctx.query.page || 1, ctx.query.limit || 10);
    const supabase = ensureSupabaseAdmin();
    const userId = ctx.user!.id;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("department_id, batch")
      .eq("id", userId)
      .maybeSingle();
    if (profileError) throw profileError;

    if (!profile?.department_id && !profile?.batch) {
      return getPosts(ctx);
    }

    let profileQuery = supabase.from("profiles").select("id");
    if (profile.department_id) profileQuery = profileQuery.eq("department_id", profile.department_id);
    if (profile.batch) profileQuery = profileQuery.eq("batch", profile.batch);

    const { data: matchingProfiles, error: matchingError } = await profileQuery;
    if (matchingError) throw matchingError;

    const authorIds = (matchingProfiles || []).map((matchingProfile) => matchingProfile.id);
    if (!authorIds.length) return emptyPage(page, limit);

    const categoryIds = await getCategoryPostIds(ctx.query.category);
    if (categoryIds && !categoryIds.length) return emptyPage(page, limit);

    let query = supabase
      .from("posts")
      .select(postSelect, { count: "exact" })
      .eq("status", "active")
      // Selecting by the author's cohort would shrink an anonymous author's
      // anonymity set to their department and batch.
      .eq("is_anonymous", false)
      .in("author_id", authorIds)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (categoryIds) query = query.in("id", categoryIds);

    return await respondWithPosts(query, page, limit, 0, userId);
  } catch (error: any) {
    logger.error("Error fetching user feed:", error);
    return serverError("Failed to fetch user feed", error.message);
  }
};
