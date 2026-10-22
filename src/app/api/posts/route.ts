import { acceptStoredUpload, authenticateToken, createLimiter, imageUpload, route } from "@/server/kit";
import { createPost, getPosts } from "@/server/controllers/postController";

export const GET = route([authenticateToken], getPosts);
export const POST = route([authenticateToken, createLimiter, imageUpload(), acceptStoredUpload("post")], createPost);
