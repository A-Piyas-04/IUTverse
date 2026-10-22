import { authenticateToken, createLimiter, route } from "@/server/kit";
import { createUploadIntent } from "@/server/controllers/uploadController";

export const POST = route([authenticateToken, createLimiter], createUploadIntent);
