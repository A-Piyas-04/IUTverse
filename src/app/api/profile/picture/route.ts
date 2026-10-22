import { authenticateToken, route } from "@/server/kit";
import { deleteProfilePicture } from "@/server/controllers/profileController";

export const DELETE = route([authenticateToken], deleteProfilePicture);
