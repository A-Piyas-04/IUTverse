import { acceptStoredUpload, authenticateToken, createLimiter, pdfUpload, route } from "@/server/kit";
import { createAcademicResource, getAllAcademicResources } from "@/server/controllers/academicResourceController";

export const GET = route([authenticateToken], getAllAcademicResources);
export const POST = route([authenticateToken, createLimiter, pdfUpload(), acceptStoredUpload("resource")], createAcademicResource);
