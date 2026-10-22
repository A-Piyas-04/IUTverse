import { authenticateToken, route } from "@/server/kit";
import { deleteCoverPicture } from "@/server/controllers/profileController";

export const DELETE = route([authenticateToken], deleteCoverPicture);
