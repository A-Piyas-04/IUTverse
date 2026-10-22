import { acceptStoredUpload, attachmentUpload, authenticateToken, createLimiter, route } from "@/server/kit";
import { sendMessage } from "@/server/controllers/chatController";

export const POST = route([authenticateToken, createLimiter, attachmentUpload(), acceptStoredUpload("chat", { nameField: "attachmentName" })], sendMessage);
