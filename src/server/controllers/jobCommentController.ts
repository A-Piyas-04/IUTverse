import "server-only";
import type { Handler } from "../http/context";
import * as response from "../http/responses";
import { json } from "../http/responses";
import jobCommentService from "../services/jobCommentService";
import logger from "../utils/logger";
import { pagination, positiveInt, requiredText } from "../utils/validation";

export const createComment: Handler = async (ctx) => {
  try {
    const { userId } = ctx.user!;
    const { id: jobId } = ctx.params;
    const { content } = ctx.body;

    logger.debug("[JobCommentController] Creating comment", {
      userId,
      jobId,
    });

    const contentResult = requiredText(content, "Comment content", { max: 2000 });
    if (!contentResult.ok) return response.badRequest(contentResult.error);

    const commentData = {
      content: contentResult.value,
      authorId: userId,
      jobId: Number(jobId),
    };

    const comment = await jobCommentService.createComment(commentData);
    logger.info("[JobCommentController] Comment created", { id: comment.id });
    return json(201, comment);
  } catch (error: any) {
    logger.error("[JobCommentController] Error creating comment", error);
    return json(500, { message: "Error creating comment", error: error.message });
  }
};

export const getCommentsByJobId: Handler = async (ctx) => {
  try {
    const { id: jobId } = ctx.params;
    const id = positiveInt(jobId, "Job ID");
    if (!id.ok) return response.badRequest(id.error);
    const pageInfo = pagination(ctx.query.page, ctx.query.limit);
    logger.debug("[JobCommentController] Fetching comments for job", { jobId });

    const result = await jobCommentService.getCommentsByJobId(id.value, pageInfo);
    logger.debug("[JobCommentController] Comments fetched", { jobId, count: result.comments.length });
    return json(200, {
      success: true,
      data: result.comments,
      pagination: result.pagination,
    });
  } catch (error: any) {
    logger.error("[JobCommentController] Error fetching comments", error);
    return json(500, { message: "Error fetching comments", error: error.message });
  }
};

export const createReply: Handler = async (ctx) => {
  try {
    const { userId } = ctx.user!;
    const { id: jobId, commentId } = ctx.params;
    const { content } = ctx.body;

    logger.debug("[JobCommentController] Creating reply", {
      userId,
      jobId,
      commentId,
    });

    const contentResult = requiredText(content, "Reply content", { max: 2000 });
    if (!contentResult.ok) return response.badRequest(contentResult.error);

    const replyData = {
      content: contentResult.value,
      authorId: userId,
      jobId: Number(jobId),
    };

    const reply = await jobCommentService.createReply(commentId, replyData);
    logger.info("[JobCommentController] Reply created", { id: reply.id });
    return json(201, reply);
  } catch (error: any) {
    logger.error("[JobCommentController] Error creating reply", error);
    return json(500, { message: "Error creating reply", error: error.message });
  }
};

export const updateComment: Handler = async (ctx) => {
  try {
    const { userId } = ctx.user!;
    const { commentId } = ctx.params;
    const { content } = ctx.body;

    logger.debug("[JobCommentController] Updating comment", {
      userId,
      commentId,
    });

    const contentResult = requiredText(content, "Comment content", { max: 2000 });
    if (!contentResult.ok) return response.badRequest(contentResult.error);

    const comment = await jobCommentService.updateComment(commentId, contentResult.value, userId);
    logger.info("[JobCommentController] Comment updated", { id: comment.id });
    return json(200, comment);
  } catch (error: any) {
    logger.error("[JobCommentController] Error updating comment", error);
    if (error.message === "Unauthorized to update this comment") {
      return json(403, { message: error.message });
    }
    return json(500, { message: "Error updating comment", error: error.message });
  }
};

export const deleteComment: Handler = async (ctx) => {
  try {
    const { userId } = ctx.user!;
    const { commentId } = ctx.params;

    logger.debug("[JobCommentController] Deleting comment", {
      userId,
      commentId,
    });

    await jobCommentService.deleteComment(commentId, userId);
    logger.info("[JobCommentController] Comment deleted", { id: commentId });
    return json(200, { message: "Comment deleted successfully" });
  } catch (error: any) {
    logger.error("[JobCommentController] Error deleting comment", error);
    if (error.message === "Unauthorized to delete this comment") {
      return json(403, { message: error.message });
    }
    return json(500, { message: "Error deleting comment", error: error.message });
  }
};

export const getCommentById: Handler = async (ctx) => {
  try {
    const { commentId } = ctx.params;
    logger.debug("[JobCommentController] Fetching comment", { commentId });

    const comment = await jobCommentService.getCommentById(commentId);
    if (!comment) {
      return json(404, { message: "Comment not found" });
    }

    return json(200, comment);
  } catch (error: any) {
    logger.error("[JobCommentController] Error fetching comment", error);
    return json(500, { message: "Error fetching comment", error: error.message });
  }
};
