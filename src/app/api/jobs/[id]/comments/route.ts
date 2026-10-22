import { authenticateToken, createLimiter, route } from "@/server/kit";
import { createComment, getCommentsByJobId } from "@/server/controllers/jobCommentController";

export const GET = route([authenticateToken], getCommentsByJobId);
export const POST = route([authenticateToken, createLimiter], createComment);
