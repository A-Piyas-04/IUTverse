import "server-only";
import type { Step } from "../http/context";
import { isPublicError } from "../http/errors";
import { failure } from "../http/responses";
import * as uploadIntentService from "../services/uploadIntentService";
import type { UploadPurpose } from "../services/uploadIntentService";
import { optionalText } from "../utils/validation";

// Lets a route accept either a multipart file (small files; the multipart step
// runs first) or `uploadPath`, an object the client already put in Storage
// through POST /api/uploads. A valid claim becomes ctx.file, so controllers
// handle both the same way. Run after authenticateToken and the multipart step.
export const acceptStoredUpload =
  (purpose: UploadPurpose, { nameField }: { nameField?: string } = {}): Step =>
  async (ctx) => {
    const reference = ctx.body?.uploadPath;
    if (reference === undefined || reference === null || reference === "") return;
    if (ctx.file) return failure(400, "Send either a file or an uploadPath, not both");

    try {
      ctx.file = await uploadIntentService.claimUpload({ userId: ctx.user!.id, purpose, path: String(reference) });
      if (nameField) ctx.file.originalname = optionalText(ctx.body[nameField], { max: 200 }) || ctx.file.originalname;
    } catch (error) {
      if (isPublicError(error)) return failure(error.statusCode, error.message);
      throw error;
    }
  };
