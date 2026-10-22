import "server-only";
import type { Handler } from "../http/context";
import { badRequest, forbidden, json, notFound, serverError } from "../http/responses";
import logger from "../utils/logger";
import { ensureSupabaseAdmin, mapProfile, pageRange, profileSelect } from "../utils/supabaseData";
import { positiveInt, requiredText } from "../utils/validation";
import { canViewContent } from "../utils/contentVisibility";

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
});

const commentSelect = `*, user:profiles!post_comments_author_id_fkey(${profileSelect})`;

export const createComment: Handler = async (ctx) => {
  try {
    const supabase = ensureSupabaseAdmin();
    const postIdResult = positiveInt(ctx.params.id, "Post ID");
    if (!postIdResult.ok) return badRequest(postIdResult.error);

    const contentResult = requiredText(ctx.body.content, "Comment content", { max: 2000 });
    if (!contentResult.ok) return badRequest(contentResult.error);

    const parentResult = ctx.body.parentCommentId
      ? positiveInt(ctx.body.parentCommentId, "Parent comment ID")
      : ({ ok: true, value: null } as const);
    if (!parentResult.ok) return badRequest(parentResult.error);

    const { data, error } = await supabase
      .from("post_comments")
      .insert({
        post_id: postIdResult.value,
        author_id: ctx.user!.id,
        content: contentResult.value,
        parent_comment_id: parentResult.value,
        is_anonymous: ctx.body.isAnonymous === true || ctx.body.isAnonymous === "true",
      })
      .select(commentSelect)
      .single();

    if (error) throw error;
    return json(201, { success: true, data: mapComment(data) });
  } catch (error: any) {
    logger.error("Error creating comment:", error);
    return serverError("Failed to create comment", error.message);
  }
};

export const getPostComments: Handler = async (ctx) => {
  try {
    const supabase = ensureSupabaseAdmin();
    const postIdResult = positiveInt(ctx.params.id, "Post ID");
    if (!postIdResult.ok) return badRequest(postIdResult.error);

    // Comments are only as visible as the post they belong to.
    const { data: post, error: postError } = await supabase.from("posts").select("id, status, author_id").eq("id", postIdResult.value).maybeSingle();
    if (postError) throw postError;
    if (!post || !canViewContent({ status: post.status, ownerId: post.author_id, viewer: ctx.user })) return notFound("Post not found");

    const { page, limit, from, to } = pageRange(ctx.query.page || 1, ctx.query.limit || 20);
    const { data, count, error } = await supabase
      .from("post_comments")
      .select(commentSelect, { count: "exact" })
      .eq("post_id", postIdResult.value)
      .eq("status", "active")
      .is("parent_comment_id", null)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;
    return json(200, {
      success: true,
      data: (data as any[]).map(mapComment),
      pagination: { page, limit, totalComments: count || 0, totalPages: Math.ceil((count || 0) / limit) },
    });
  } catch (error: any) {
    logger.error("Error fetching comments:", error);
    return serverError("Failed to fetch comments", error.message);
  }
};

export const getCommentReplies: Handler = async (ctx) => {
  try {
    const supabase = ensureSupabaseAdmin();
    const commentIdResult = positiveInt(ctx.params.commentId, "Comment ID");
    if (!commentIdResult.ok) return badRequest(commentIdResult.error);

    const { data, error } = await supabase
      .from("post_comments")
      .select(commentSelect)
      .eq("parent_comment_id", commentIdResult.value)
      .eq("status", "active")
      .order("created_at", { ascending: true });

    if (error) throw error;
    return json(200, { success: true, data: (data as any[]).map(mapComment) });
  } catch (error: any) {
    logger.error("Error fetching replies:", error);
    return serverError("Failed to fetch replies", error.message);
  }
};

export const updateComment: Handler = async (ctx) => {
  try {
    const supabase = ensureSupabaseAdmin();
    const idResult = positiveInt(ctx.params.commentId, "Comment ID");
    if (!idResult.ok) return badRequest(idResult.error);
    const id = idResult.value;

    const contentResult = requiredText(ctx.body.content, "Comment content", { max: 2000 });
    if (!contentResult.ok) return badRequest(contentResult.error);

    const { data: existing, error: findError } = await supabase.from("post_comments").select("*").eq("id", id).maybeSingle();
    if (findError) throw findError;
    if (!existing) return notFound("Comment not found");
    if (existing.author_id !== ctx.user!.id) return forbidden("Unauthorized");

    const { data, error } = await supabase
      .from("post_comments")
      .update({ content: contentResult.value })
      .eq("id", id)
      .select(commentSelect)
      .single();

    if (error) throw error;
    return json(200, { success: true, data: mapComment(data) });
  } catch (error: any) {
    logger.error("Error updating comment:", error);
    return serverError("Failed to update comment", error.message);
  }
};

export const deleteComment: Handler = async (ctx) => {
  try {
    const supabase = ensureSupabaseAdmin();
    const idResult = positiveInt(ctx.params.commentId, "Comment ID");
    if (!idResult.ok) return badRequest(idResult.error);
    const id = idResult.value;

    const { data: existing, error: findError } = await supabase.from("post_comments").select("*").eq("id", id).maybeSingle();
    if (findError) throw findError;
    if (!existing) return notFound("Comment not found");
    if (existing.author_id !== ctx.user!.id) return forbidden("Unauthorized");

    const { error } = await supabase.from("post_comments").delete().eq("id", id);
    if (error) throw error;
    return json(200, { success: true, message: "Comment deleted successfully" });
  } catch (error: any) {
    logger.error("Error deleting comment:", error);
    return serverError("Failed to delete comment", error.message);
  }
};
