import { authenticateToken, createLimiter, route } from "@/server/kit";
import { addComment } from "@/server/controllers/catPostController";

export const POST = route([authenticateToken, createLimiter], addComment);
