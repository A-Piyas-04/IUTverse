import "server-only";
import type { Handler } from "../http/context";
import { isPublicError } from "../http/errors";
import * as response from "../http/responses";
import * as uploadIntentService from "../services/uploadIntentService";
import logger from "../utils/logger";

// Returns a signed URL the browser uploads to directly; see uploadIntentService.
export const createUploadIntent: Handler = async (ctx) => {
  try {
    const { purpose, mimeType, size, conversationId } = ctx.body || {};
    const intent = await uploadIntentService.createUploadIntent({ userId: ctx.user!.id, purpose, mimeType, size, conversationId });
    return response.created(intent);
  } catch (error: any) {
    if (isPublicError(error)) return response.failure(error.statusCode || 400, error.message);
    logger.error("createUploadIntent failed", error);
    return response.serverError("Could not prepare the upload", error.message);
  }
};
