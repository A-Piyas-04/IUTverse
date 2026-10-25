import { authenticateToken, createLimiter, route } from "@/server/kit";
import { sharePost } from "@/server/controllers/chatController";

export const POST = route([authenticateToken, createLimiter], sharePost);
