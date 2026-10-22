import { authenticateToken, createLimiter, route } from "@/server/kit";
import { createReply } from "@/server/controllers/jobCommentController";

export const POST = route([authenticateToken, createLimiter], createReply);
