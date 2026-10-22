import { authenticateToken, createLimiter, route } from "@/server/kit";
import { deleteComment, getCommentById, updateComment } from "@/server/controllers/jobCommentController";

export const GET = route([authenticateToken], getCommentById);
export const PUT = route([authenticateToken, createLimiter], updateComment);
export const DELETE = route([authenticateToken], deleteComment);
