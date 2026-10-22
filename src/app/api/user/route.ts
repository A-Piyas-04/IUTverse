import { authenticateToken, route } from "@/server/kit";
import { updateUserName } from "@/server/controllers/userController";

export const PUT = route([authenticateToken], updateUserName);
