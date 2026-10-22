import { authenticateToken, createLimiter, route } from "@/server/kit";
import { validateIdParam, validateReactionData } from "@/server/middleware/confessionValidation";
import { addReaction, removeReaction } from "@/server/controllers/confessionController";

export const POST = route([authenticateToken, createLimiter, validateIdParam, validateReactionData], addReaction);
export const DELETE = route([authenticateToken, validateIdParam], removeReaction);
