import { authenticateToken, route } from "@/server/kit";
import { reactToMessage } from "@/server/controllers/chatController";

export const POST = route([authenticateToken], reactToMessage);
