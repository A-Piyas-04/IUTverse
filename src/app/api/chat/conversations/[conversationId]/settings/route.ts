import { authenticateToken, route } from "@/server/kit";
import { updateConversationSettings } from "@/server/controllers/chatController";

export const PATCH = route([authenticateToken], updateConversationSettings);
