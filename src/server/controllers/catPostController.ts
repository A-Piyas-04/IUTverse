import "server-only";
import type { Handler } from "../http/context";
import * as response from "../http/responses";
import { json } from "../http/responses";
import catPostService from "../services/catPostService";
import logger from "../utils/logger";
import { canViewContent } from "../utils/contentVisibility";
import { pagination, positiveInt, requiredText } from "../utils/validation";

export const createPost: Handler = async (ctx) => {
  try {
    // Get userId from authenticated user, or null for anonymous posts
    const userId = ctx.user ? ctx.user.id : null;
    const { caption, category, location } = ctx.body;
    const image = ctx.file;

    const captionResult = requiredText(caption, "Caption", { max: 1000 });
    if (!captionResult.ok) return response.badRequest(captionResult.error);

    const post = await catPostService.createPost(userId as string, captionResult.value, image, { category, location });
    return json(201, { success: true, data: post });
  } catch (error: any) {
    logger.error("Create post error:", error);
    return json(500, { success: false, message: error.message });
  }
};

export const getAllPosts: Handler = async (ctx) => {
  try {
    const page = parseInt(String(ctx.query.page)) || 1;
    const limit = parseInt(String(ctx.query.limit)) || 10;
    const safePage = pagination(page, limit, 100);

    const result = await catPostService.getAllPosts(safePage.page, safePage.limit, ctx.query.category);
    return json(200, { success: true, data: result });
  } catch (error: any) {
    logger.error("Get posts error:", error);
    return json(500, { success: false, message: error.message });
  }
};

export const getPostById: Handler = async (ctx) => {
  try {
    const postId = positiveInt(ctx.params.id, "Post ID");
    if (!postId.ok) return response.badRequest(postId.error);

    const post = await catPostService.getPostById(postId.value);
    if (!canViewContent({ status: post.status, ownerId: post.userId, viewer: ctx.user })) {
      return response.notFound("Post not found");
    }
    return json(200, { success: true, data: post });
  } catch (error: any) {
    logger.error("Get post error:", error);
    if (error.message === "Post not found") {
      return json(404, { success: false, message: error.message });
    }
    return json(500, { success: false, message: error.message });
  }
};

export const toggleLike: Handler = async (ctx) => {
  try {
    const userId = ctx.user!.id;
    const postId = positiveInt(ctx.params.id, "Post ID");
    if (!postId.ok) return response.badRequest(postId.error);

    const result = await catPostService.toggleLike(userId, postId.value);
    return json(200, { success: true, data: result });
  } catch (error: any) {
    logger.error("Toggle like error:", error);
    return json(500, { success: false, message: error.message });
  }
};

export const addComment: Handler = async (ctx) => {
  try {
    const userId = ctx.user!.id;
    const postId = positiveInt(ctx.params.id, "Post ID");
    const { content } = ctx.body;
    if (!postId.ok) return response.badRequest(postId.error);

    const contentResult = requiredText(content, "Comment content", { max: 1000 });
    if (!contentResult.ok) return response.badRequest(contentResult.error);

    const comment = await catPostService.addComment(userId, postId.value, contentResult.value);
    return json(201, { success: true, data: comment });
  } catch (error: any) {
    logger.error("Add comment error:", error);
    return json(500, { success: false, message: error.message });
  }
};

export const deletePost: Handler = async (ctx) => {
  try {
    const userId = ctx.user!.id;
    const postId = positiveInt(ctx.params.id, "Post ID");
    if (!postId.ok) return response.badRequest(postId.error);

    const result = await catPostService.deletePost(userId, postId.value);
    return json(200, { success: true, data: result });
  } catch (error: any) {
    logger.error("Delete post error:", error);
    if (error.message === "Post not found") {
      return json(404, { success: false, message: error.message });
    } else if (error.message === "Unauthorized to delete this post") {
      return json(403, { success: false, message: error.message });
    }
    return json(500, { success: false, message: error.message });
  }
};
