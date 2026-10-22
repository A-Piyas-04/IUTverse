import { authenticateToken, route } from "@/server/kit";
import { validateIdParam } from "@/server/middleware/confessionValidation";
import { getUserReactions } from "@/server/controllers/confessionController";

export const GET = route([authenticateToken, validateIdParam], getUserReactions);
