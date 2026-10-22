import { authenticateToken, createLimiter, route } from "@/server/kit";
import { toggleHelpful } from "@/server/controllers/communityController";

export const POST = route([authenticateToken, createLimiter], toggleHelpful);
