// Everything a route file needs to describe its middleware chain, in one import.
// Route files read like the Express routers they replace:
//   export const POST = route([authenticateToken, createLimiter, imageUpload(), acceptStoredUpload("post")], handler);
export { route } from "./http/route";
export { authLimiter, createLimiter, lookupLimiter } from "./http/rateLimit";
export { attachmentUpload, coverPictureUpload, imageUpload, pdfUpload, profilePictureUpload } from "./http/uploads";
export { authenticateToken, optionalAuth } from "./middleware/auth";
export { requireAdmin, requireRole } from "./middleware/authorization";
export { acceptStoredUpload } from "./middleware/storedUpload";
