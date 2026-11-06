import "server-only";
import { randomUUID } from "node:crypto";
import type { Handler } from "../http/context";
import { badRequest, forbidden, json, notFound, serverError } from "../http/responses";
import { isPublicError } from "../http/errors";
import { isUniqueViolation, keyReusedError, publicErrorResponse, readIdempotencyKey, REPLAYED_HEADER } from "../http/idempotency";
import { removeObject } from "../services/storageService";
import logger from "../utils/logger";
import { ensureSupabaseAdmin, mapProfile, pageRange, postImagePath, postImageUrl, profileSelect, uploadToBucket } from "../utils/supabaseData";
import { filterSearchTerm, optionalText, positiveInt, requiredText, uuid } from "../utils/validation";
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
    image: postImagePath(post),
    imageUrl: postImageUrl(post),
    // Lets an anonymous post's author manage it; true only for the author.
    isOwner: Boolean(currentUserId) && post.author_id === currentUserId,
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

const anonymizePostImage = async (post: any) => {
  if (!post.image_path || postImagePath(post)) return post;
  const supabase = ensureSupabaseAdmin();
  const target = `anonymous/${randomUUID()}${post.image_path.slice(post.image_path.lastIndexOf("."))}`;
  const { error } = await supabase.storage.from(post.image_bucket).move(post.image_path, target);
  if (error) {
    // Another request may have just moved it. The image stays hidden meanwhile.
    logger.warn("Could not move an anonymous post image", { postId: post.id });
    return post;
  }
  const { error: updateError } = await supabase.from("posts").update({ image_path: target }).eq("id", post.id);
  if (updateError) throw updateError;
  return { ...post, image_path: target };
};

const hydratePost = async (rawPost: any, commentLimit = 3, currentUserId: string | null = null) => {
  const supabase = ensureSupabaseAdmin();
  const post = await anonymizePostImage(rawPost);
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

  const ids = (comments.data as any[]).map((comment) => comment.id);
  const replies = ids.length
    ? await supabase
        .from("post_comments")
        .select(`*, user:profiles!post_comments_author_id_fkey(${profileSelect})`)
        .in("parent_comment_id", ids)
        .eq("status", "active")
        .order("created_at", { ascending: true })
    : { data: [], error: null };
  if (replies.error) throw replies.error;

  return mapPost({
    ...post,
    categories: categories.data,
    reactions: reactions.data,
    comments: (comments.data as any[]).map((comment) => ({ ...comment, replies: ((replies.data as any[]) || []).filter((reply) => reply.parent_comment_id === comment.id) })),
  }, currentUserId);
};

const attachCategory = async (postId: number, categoryName: string | null) => {
  if (!categoryName) return;
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
    .ilike("category.name", String(category).replace(/[%_*\\]/g, " "))
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

interface PostFilter {
  authorId?: string;
  cohort?: { department_id?: number | null; batch?: number | null };
  /** Leave out anonymous posts. Required whenever posts are picked by who wrote them. */
  namedOnly?: boolean;
  category?: unknown;
  withImage?: boolean;
}

// Active posts, newest first, narrowed by the filter and the `search` parameter.
const listPosts = async (ctx: Parameters<Handler>[0], filter: PostFilter = {}) => {
  const { page, limit, from, to } = pageRange(ctx.query.page || 1, ctx.query.limit || 10);
  const categoryIds = await getCategoryPostIds(filter.category);
  if (categoryIds && !categoryIds.length) return emptyPage(page, limit);

  const select = filter.cohort ? postSelect.replace("posts_author_id_fkey(", "posts_author_id_fkey!inner(") : postSelect;
  let query = ensureSupabaseAdmin()
    .from("posts")
    .select(select, { count: "exact" })
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .range(from, to);
  if (filter.authorId) query = query.eq("author_id", filter.authorId);
  if (filter.cohort?.department_id) query = query.eq("user.department_id", filter.cohort.department_id);
  if (filter.cohort?.batch) query = query.eq("user.batch", filter.cohort.batch);
  if (filter.namedOnly) query = query.eq("is_anonymous", false);
  if (categoryIds) query = query.in("id", categoryIds);
  if (filter.withImage) query = query.not("image_path", "is", null);
  const term = filterSearchTerm(optionalText(ctx.query.search, { max: 100 })).replace(/[%_*]/g, " ").trim();
  if (term) query = query.ilike("content", `%${term}%`);

  return respondWithPosts(query, page, limit, 0, ctx.user?.id || null);
};

const viewerCohort = async (userId: string) => {
  const { data, error } = await ensureSupabaseAdmin().from("profiles").select("department_id, batch").eq("id", userId).maybeSingle();
  if (error) throw error;
  return { department_id: data?.department_id ?? null, batch: data?.batch ?? null };
};

// Tabs that are not stored categories, and tab names for ones that are.
const CATEGORY_ALIASES: Record<string, string> = { questions: "question", resources: "resource" };

const removeImage = (bucket?: string | null, path?: string | null) =>
  bucket && path ? removeObject({ bucket, objectPath: path }).catch((error) => logger.warn("Could not remove a post image", { message: error?.message })) : undefined;

// Only live posts take reactions and replies. Missing and hidden look the same.
const findLivePost = async (postId: number) => {
  const { data, error } = await ensureSupabaseAdmin().from("posts").select("id, status").eq("id", postId).maybeSingle();
  if (error) throw error;
  return data?.status === "active" ? data : null;
};

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

    // Retry protection (docs/api/idempotency.md). A retry with the same Idempotency-Key returns the post that already
    // exists instead of creating a second one. Without a key nothing changes.
    const idempotency = readIdempotencyKey(ctx.request.headers);
    if ("error" in idempotency) return idempotency.error;
    const key = idempotency.key;
    const wantsAnonymous = isAnonymous === "true" || isAnonymous === true;
    const replay = async (existing: any) => {
      const dto = await hydratePost(existing, 3, userId);
      // An anonymous post's image has moved, so only its size can be compared.
      const sameImage = ctx.file ? (ctx.file.stored && !existing.is_anonymous ? existing.image_path === ctx.file.path : existing.image_size_bytes === ctx.file.size) : !existing.image_path;
      if (dto.content !== (content || "") || Boolean(dto.isAnonymous) !== wantsAnonymous || dto.category !== (category ?? null) || !sameImage) throw keyReusedError();
      ctx.responseHeaders.set(REPLAYED_HEADER, "true");
      return json(201, { success: true, data: dto });
    };
    const findExisting = async () => {
      const { data, error } = await ensureSupabaseAdmin().from("posts").select(postSelect).eq("author_id", userId).eq("client_request_id", key).maybeSingle();
      if (error) throw error;
      return data;
    };
    if (key) {
      const existing = await findExisting();
      if (existing) return await replay(existing);
    }

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
        client_request_id: key,
        content: content || "",
        is_anonymous: wantsAnonymous,
        image_path: image.path,
        image_bucket: image.bucket,
        image_mime_type: image.mimeType,
        image_size_bytes: image.size,
      })
      .select(postSelect)
      .single();

    if (error) {
      // A concurrent retry with the same key won the race: return its post and drop the image this request stored.
      if (key && isUniqueViolation(error)) {
        const winner = await findExisting();
        if (winner) {
          if (ctx.file && !ctx.file.stored && image.path && image.path !== winner.image_path) await removeObject({ bucket: image.bucket, objectPath: image.path }).catch(() => {});
          return await replay(winner);
        }
      }
      throw error;
    }
    await attachCategory(post.id, category);

    return json(201, { success: true, data: await hydratePost(post, 3, userId) });
  } catch (error: any) {
    if (isPublicError(error)) return publicErrorResponse(error);
    logger.error("Error creating post:", error);
    return serverError("Failed to create post", error.message);
  }
};

export const getPosts: Handler = async (ctx) => {
  try {
    const viewerId = ctx.user!.id;
    const { userId } = ctx.query;
    if (userId) {
      const author = uuid(userId, "User ID");
      if (!author.ok) return badRequest(author.error);
      // Others never see someone's anonymous posts on their profile.
      return await listPosts(ctx, { authorId: author.value, namedOnly: author.value !== viewerId });
    }

    const category = String(ctx.query.category || "").trim();
    const tab = category.toLowerCase();
    if (tab === "media") return await listPosts(ctx, { withImage: true });
    if (tab === "department" || tab === "batch") {
      const cohort = await viewerCohort(viewerId);
      const value = cohort[tab === "department" ? "department_id" : "batch"];
      if (!value) {
        const { page, limit } = pageRange(ctx.query.page || 1, ctx.query.limit || 10);
        return emptyPage(page, limit);
      }
      return await listPosts(ctx, { cohort: tab === "department" ? { department_id: value } : { batch: value }, namedOnly: true });
    }
    return await listPosts(ctx, { category: CATEGORY_ALIASES[tab] || category || undefined });
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
    if (existing.status !== "active") return forbidden("This post is under moderation and cannot be edited");

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

    const category = ctx.body.category ? optionalText(ctx.body.category, { max: 80 }) : null;
    if (!Object.keys(payload).length && !category) return badRequest("Nothing to update");

    let post = existing;
    if (Object.keys(payload).length) {
      const { data, error } = await supabase.from("posts").update(payload).eq("id", postId).select(postSelect).single();
      if (error) throw error;
      post = data;
    } else {
      const { data, error } = await supabase.from("posts").select(postSelect).eq("id", postId).single();
      if (error) throw error;
      post = data;
    }
    if (payload.image_path && existing.image_path !== payload.image_path) await removeImage(existing.image_bucket, existing.image_path);
    if (category) {
      // A post has one category: the new one replaces the old.
      const { error: unlinkError } = await supabase.from("post_category_links").delete().eq("post_id", post.id);
      if (unlinkError) throw unlinkError;
      await attachCategory(post.id, category);
    }
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
    await removeImage(existing.image_bucket, existing.image_path);
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
    if (!(await findLivePost(postId))) return notFound("Post not found");

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

// The home feed. `scope` is the tab: for_you (same department and batch, or
// everything for members who have not set those), department, batch, resources.
export const getUserFeed: Handler = async (ctx) => {
  try {
    const { page, limit } = pageRange(ctx.query.page || 1, ctx.query.limit || 10);
    const scope = String(ctx.query.scope || "for_you");
    const category = ctx.query.category;
    if (scope === "resources") return await listPosts(ctx, { category: "resource" });

    const { department_id, batch } = await viewerCohort(ctx.user!.id);
    // Selecting by the author's cohort would shrink an anonymous author's
    // anonymity set to their department and batch, so those stay out.
    if (scope === "department") return department_id ? await listPosts(ctx, { cohort: { department_id }, namedOnly: true, category }) : emptyPage(page, limit);
    if (scope === "batch") return batch ? await listPosts(ctx, { cohort: { batch }, namedOnly: true, category }) : emptyPage(page, limit);
    if (!department_id && !batch) return await listPosts(ctx, { category });
    return await listPosts(ctx, { cohort: { department_id, batch }, namedOnly: true, category });
  } catch (error: any) {
    logger.error("Error fetching user feed:", error);
    return serverError("Failed to fetch user feed", error.message);
  }
};
