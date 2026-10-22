import "server-only";
import type { Handler } from "../http/context";
import * as response from "../http/responses";
import { json } from "../http/responses";
import lostAndFoundService from "../services/lostAndFoundService";
import type { LostFoundDto } from "../services/lostAndFoundService";
import logger from "../utils/logger";
import { enumValue, optionalText, pagination, positiveInt, requiredText } from "../utils/validation";
import { canModerate } from "../middleware/authorization";
import { LOST_FOUND_PUBLIC_STATUSES, canViewContent } from "../utils/contentVisibility";

// Lost & found is readable without signing in. Anonymous callers do not get
// the poster's identity or contact details.
const forViewer = (post: LostFoundDto, viewer: unknown): LostFoundDto =>
  viewer ? post : { ...post, userId: null, user: null, contact: null, contactNote: null };

// Get all lost and found posts
export const getAllPosts: Handler = async (ctx) => {
  try {
    const filters: { type?: string; status?: string; search?: string | null } = {
      type: ctx.query.type as string | undefined,
      status: (ctx.query.status as string | undefined) || "active",
      search: optionalText(ctx.query.search, { max: 200 }),
    };

    if (filters.type && filters.type !== "all") {
      const type = enumValue(filters.type, ["lost", "found"], "Type");
      if (!type.ok) return response.badRequest(type.error);
      filters.type = type.value;
    }

    if (filters.status) {
      const allowed = canModerate(ctx.user) ? ["active", "resolved", "archived", "deleted", "flagged"] : LOST_FOUND_PUBLIC_STATUSES;
      const status = enumValue(filters.status, allowed, "Status");
      if (!status.ok) return response.badRequest(status.error);
      filters.status = status.value;
    }

    const pageInfo = pagination(ctx.query.page, ctx.query.limit);
    const result = await lostAndFoundService.getAllPosts(filters, pageInfo);

    return json(200, {
      success: true,
      data: result.posts.map((post) => forViewer(post, ctx.user)),
      pagination: result.pagination,
    });
  } catch (error: any) {
    logger.error("Error in getAllPosts:", error);
    return json(500, { success: false, message: "Failed to fetch posts", error: error.message });
  }
};

// Get a single post by ID
export const getPostById: Handler = async (ctx) => {
  try {
    const postIdResult = positiveInt(ctx.params.postId, "Post ID");
    if (!postIdResult.ok) return response.badRequest(postIdResult.error);

    const post = await lostAndFoundService.getPostById(postIdResult.value);

    if (!post || !canViewContent({ status: post.status, ownerId: post.userId, viewer: ctx.user, publicStatuses: LOST_FOUND_PUBLIC_STATUSES })) {
      return json(404, { success: false, message: "Post not found" });
    }

    return json(200, { success: true, data: forViewer(post, ctx.user) });
  } catch (error: any) {
    logger.error("Error in getPostById:", error);
    return json(500, { success: false, message: "Failed to fetch post", error: error.message });
  }
};

// Create a new lost and found post
export const createPost: Handler = async (ctx) => {
  try {
    const userId = ctx.user!.id;
    const postData = ctx.body;

    const type = enumValue(postData.type, ["lost", "found"], "Type");
    if (!type.ok) return response.badRequest(type.error);
    const title = requiredText(postData.title, "Title", { max: 160 });
    if (!title.ok) return response.badRequest(title.error);
    const description = requiredText(postData.description, "Description", { max: 3000 });
    if (!description.ok) return response.badRequest(description.error);
    const location = requiredText(postData.location, "Location", { max: 200 });
    if (!location.ok) return response.badRequest(location.error);
    const contact = requiredText(postData.contact || postData.contactNote || "IUTverse messages", "Contact", { max: 200 });
    if (!contact.ok) return response.badRequest(contact.error);

    const safePostData = {
      type: type.value,
      title: title.value,
      description: description.value,
      location: location.value,
      contact: contact.value,
      category: optionalText(postData.category, { max: 120 }),
      occurredAt: postData.occurredAt && !Number.isNaN(Date.parse(postData.occurredAt)) ? new Date(postData.occurredAt).toISOString() : null,
      contactPreference: optionalText(postData.contactPreference, { max: 40 }) || "message",
      contactNote: optionalText(postData.contactNote, { max: 200 }),
      returnLocation: optionalText(postData.returnLocation, { max: 200 }),
      availability: optionalText(postData.availability, { max: 300 }),
      privacyAccepted: String(postData.privacyAccepted).toLowerCase() === "true",
    };

    try {
      const post = await lostAndFoundService.createPost(userId, safePostData, ctx.file);

      return json(201, {
        success: true,
        message: "Post created successfully",
        data: post,
      });
    } catch (serviceError: any) {
      logger.error("Controller - Error in lostAndFoundService.createPost:", serviceError);
      return json(500, {
        success: false,
        message: "Error creating post in service layer",
        error: serviceError.message,
      });
    }
  } catch (error: any) {
    logger.error("Controller - Unhandled error in createPost:", error);
    return json(500, { success: false, message: "Error creating post", error: error.message });
  }
};

// Update a lost and found post
export const updatePost: Handler = async (ctx) => {
  try {
    const userId = ctx.user!.id;
    const postIdResult = positiveInt(ctx.params.postId, "Post ID");
    if (!postIdResult.ok) return response.badRequest(postIdResult.error);

    const updateData: Record<string, any> = {};
    if (ctx.body.type !== undefined) {
      const type = enumValue(ctx.body.type, ["lost", "found"], "Type");
      if (!type.ok) return response.badRequest(type.error);
      updateData.type = type.value;
    }
    for (const [field, label, max] of [
      ["title", "Title", 160],
      ["description", "Description", 3000],
      ["location", "Location", 200],
      ["contact", "Contact", 200],
    ] as const) {
      if (ctx.body[field] !== undefined) {
        const text = requiredText(ctx.body[field], label, { max });
        if (!text.ok) return response.badRequest(text.error);
        updateData[field] = text.value;
      }
    }
    for (const [field, max] of [["category", 120], ["contactPreference", 40], ["contactNote", 200], ["returnLocation", 200], ["availability", 300]] as const) {
      if (ctx.body[field] !== undefined) updateData[field] = optionalText(ctx.body[field], { max });
    }
    if (ctx.body.occurredAt !== undefined) updateData.occurredAt = ctx.body.occurredAt ? new Date(ctx.body.occurredAt).toISOString() : null;
    if (ctx.body.privacyAccepted !== undefined) updateData.privacyAccepted = String(ctx.body.privacyAccepted).toLowerCase() === "true";

    const updatedPost = await lostAndFoundService.updatePost(postIdResult.value, userId, updateData, ctx.file);

    return json(200, { success: true, message: "Post updated successfully", data: updatedPost });
  } catch (error: any) {
    logger.error("Error in updatePost:", error);

    if (error.message === "Post not found") {
      return json(404, { success: false, message: "Post not found" });
    }

    if (error.message === "Unauthorized to update this post") {
      return json(403, { success: false, message: "Unauthorized to update this post" });
    }

    return json(500, { success: false, message: "Failed to update post", error: error.message });
  }
};

// Delete a lost and found post
export const deletePost: Handler = async (ctx) => {
  try {
    const userId = ctx.user!.id;
    const postIdResult = positiveInt(ctx.params.postId, "Post ID");
    if (!postIdResult.ok) return response.badRequest(postIdResult.error);

    const result = await lostAndFoundService.deletePost(postIdResult.value, userId);

    return json(200, { success: true, message: result.message });
  } catch (error: any) {
    logger.error("Error in deletePost:", error);

    if (error.message === "Post not found") {
      return json(404, { success: false, message: "Post not found" });
    }

    if (error.message === "Unauthorized to delete this post") {
      return json(403, { success: false, message: "Unauthorized to delete this post" });
    }

    return json(500, { success: false, message: "Failed to delete post", error: error.message });
  }
};

const statusTransition = (kind: "resolved" | "active"): Handler => async (ctx) => {
  try {
    const userId = ctx.user!.id;
    const postIdResult = positiveInt(ctx.params.postId, "Post ID");
    if (!postIdResult.ok) return response.badRequest(postIdResult.error);

    const updatedPost = kind === "resolved"
      ? await lostAndFoundService.markAsResolved(postIdResult.value, userId)
      : await lostAndFoundService.markAsActive(postIdResult.value, userId);

    return json(200, { success: true, message: `Post marked as ${kind}`, data: updatedPost });
  } catch (error: any) {
    logger.error(`Error in markAs${kind === "resolved" ? "Resolved" : "Active"}:`, error);

    if (error.message === "Post not found") {
      return json(404, { success: false, message: "Post not found" });
    }

    if (error.message === "Unauthorized to update this post") {
      return json(403, { success: false, message: "Unauthorized to update this post" });
    }

    if (/^Only \w+ posts can be marked/.test(error.message)) {
      return json(409, { success: false, message: error.message });
    }

    return json(500, { success: false, message: `Failed to mark post as ${kind}`, error: error.message });
  }
};

// Mark post as resolved
export const markAsResolved = statusTransition("resolved");

// Mark post as active
export const markAsActive = statusTransition("active");
