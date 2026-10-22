import { authenticateToken, route } from "@/server/kit";
import { getAttachment } from "@/server/controllers/chatController";

export const GET = route([authenticateToken], getAttachment);
