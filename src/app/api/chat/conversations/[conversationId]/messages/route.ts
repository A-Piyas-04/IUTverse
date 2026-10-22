import { authenticateToken, route } from "@/server/kit";
import { getMessages } from "@/server/controllers/chatController";

export const GET = route([authenticateToken], getMessages);
