import { acceptStoredUpload, authenticateToken, createLimiter, imageUpload, route } from "@/server/kit";
import { deletePost, getPost, updatePost } from "@/server/controllers/postController";

export const GET = route([authenticateToken], getPost);
export const PUT = route([authenticateToken, createLimiter, imageUpload(), acceptStoredUpload("post")], updatePost);
export const DELETE = route([authenticateToken], deletePost);
