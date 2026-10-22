import { optionalAuth, route } from "@/server/kit";
import { validateIdParam } from "@/server/middleware/confessionValidation";
import { getConfessionById } from "@/server/controllers/confessionController";

export const GET = route([optionalAuth, validateIdParam], getConfessionById);
