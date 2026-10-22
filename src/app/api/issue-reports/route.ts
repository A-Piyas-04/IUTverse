import { authenticateToken, createLimiter, route } from "@/server/kit";
import { createIssueReport } from "@/server/controllers/communityController";

export const POST = route([authenticateToken, createLimiter], createIssueReport);
