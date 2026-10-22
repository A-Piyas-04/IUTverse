import { authenticateToken, route } from "@/server/kit";
import { getCommentReplies } from "@/server/controllers/commentController";

export const GET = route([authenticateToken], getCommentReplies);
