import { authenticateToken, createLimiter, route } from "@/server/kit";
import { createComment, getPostComments } from "@/server/controllers/commentController";

export const GET = route([authenticateToken], getPostComments);
export const POST = route([authenticateToken, createLimiter], createComment);
