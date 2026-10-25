import { authenticateToken, route } from "@/server/kit";
import { blockUser, unblockUser } from "@/server/controllers/chatController";

export const POST = route([authenticateToken], blockUser);
export const DELETE = route([authenticateToken], unblockUser);
