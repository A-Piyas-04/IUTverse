import { authenticateToken, route } from "@/server/kit";
import { searchUsers } from "@/server/controllers/userController";

export const GET = route([authenticateToken], searchUsers);
