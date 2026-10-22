import { authenticateToken, route } from "@/server/kit";
import { markAsRead } from "@/server/controllers/chatController";

export const PUT = route([authenticateToken], markAsRead);
