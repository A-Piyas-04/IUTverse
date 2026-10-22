import { authenticateToken, route } from "@/server/kit";
import { getProfilePicture } from "@/server/controllers/profileController";

export const GET = route([authenticateToken], getProfilePicture);
