import { authenticateToken, createLimiter, route } from "@/server/kit";
import { validateConfessionData, validatePaginationParams } from "@/server/middleware/confessionValidation";
import { createConfession, getAllConfessions } from "@/server/controllers/confessionController";

export const GET = route([validatePaginationParams], getAllConfessions);
export const POST = route([authenticateToken, createLimiter, validateConfessionData], createConfession);
