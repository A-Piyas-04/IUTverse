import { authenticateToken, route } from "@/server/kit";
import { getProfile } from "@/server/controllers/profileController";

export const GET = route([authenticateToken], getProfile);
