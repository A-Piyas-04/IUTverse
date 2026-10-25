import { authenticateToken, route } from "@/server/kit";
import { clearConversation } from "@/server/controllers/chatController";

export const POST = route([authenticateToken], clearConversation);
