import { authenticateToken, createLimiter, route } from "@/server/kit";
import { reactToPost } from "@/server/controllers/postController";

export const POST = route([authenticateToken, createLimiter], reactToPost);
