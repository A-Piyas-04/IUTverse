import { acceptStoredUpload, authenticateToken, createLimiter, imageUpload, optionalAuth, route } from "@/server/kit";
import { deletePost, getPostById, updatePost } from "@/server/controllers/lostAndFoundController";

export const GET = route([optionalAuth], getPostById);
export const PATCH = route([authenticateToken, createLimiter, imageUpload(), acceptStoredUpload("lostFound")], updatePost);
export const DELETE = route([authenticateToken], deletePost);
