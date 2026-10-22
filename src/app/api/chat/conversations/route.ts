import { authenticateToken, createLimiter, route } from "@/server/kit";
import { getConversations, startConversation } from "@/server/controllers/chatController";

export const GET = route([authenticateToken], getConversations);
export const POST = route([authenticateToken, createLimiter], startConversation);
