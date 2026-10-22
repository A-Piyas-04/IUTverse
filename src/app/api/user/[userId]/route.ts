import { authenticateToken, route } from "@/server/kit";
import { getUserById } from "@/server/controllers/userController";

export const GET = route([authenticateToken], getUserById);
