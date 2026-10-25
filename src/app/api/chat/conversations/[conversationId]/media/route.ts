import { authenticateToken, route } from "@/server/kit";
import { conversationMedia } from "@/server/controllers/chatController";

export const GET = route([authenticateToken], conversationMedia);
