import { acceptStoredUpload, authenticateToken, createLimiter, pdfUpload, route } from "@/server/kit";
import { deleteAcademicResource, getAcademicResourceById, updateAcademicResource } from "@/server/controllers/academicResourceController";

export const GET = route([authenticateToken], getAcademicResourceById);
export const PUT = route([authenticateToken, createLimiter, pdfUpload(), acceptStoredUpload("resource")], updateAcademicResource);
export const DELETE = route([authenticateToken], deleteAcademicResource);
