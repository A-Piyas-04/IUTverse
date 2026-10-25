import { authenticateToken, route } from "@/server/kit";
import { markDelivered } from "@/server/controllers/chatController";

export const POST = route([authenticateToken], markDelivered);
