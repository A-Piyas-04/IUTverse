import { authenticateToken, route } from "@/server/kit";
import { searchConversation } from "@/server/controllers/chatController";

export const GET = route([authenticateToken], searchConversation);
