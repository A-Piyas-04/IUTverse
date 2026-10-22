import { authenticateToken, createLimiter, route } from "@/server/kit";
import { deleteComment, updateComment } from "@/server/controllers/commentController";

export const PUT = route([authenticateToken, createLimiter], updateComment);
export const DELETE = route([authenticateToken], deleteComment);
