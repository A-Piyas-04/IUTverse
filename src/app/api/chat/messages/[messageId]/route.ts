import { authenticateToken, route } from "@/server/kit";
import { editMessage } from "@/server/controllers/chatController";

export const PATCH = route([authenticateToken], editMessage);
