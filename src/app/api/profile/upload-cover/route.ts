import { acceptStoredUpload, authenticateToken, coverPictureUpload, route } from "@/server/kit";
import { uploadCoverPicture } from "@/server/controllers/profileController";

export const POST = route([authenticateToken, coverPictureUpload(), acceptStoredUpload("cover")], uploadCoverPicture);
