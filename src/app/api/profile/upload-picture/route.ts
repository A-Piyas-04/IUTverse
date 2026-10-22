import { acceptStoredUpload, authenticateToken, profilePictureUpload, route } from "@/server/kit";
import { uploadProfilePicture } from "@/server/controllers/profileController";

export const POST = route([authenticateToken, profilePictureUpload(), acceptStoredUpload("avatar")], uploadProfilePicture);
