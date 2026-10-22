import { isAllowedImageMime, isAllowedPdfMime } from "../utils/fileValidation";
import { multipartStep } from "./request";

const MB = 1024 * 1024;

/** `multer.single(field)` for images: 5 MB, JPEG/PNG/WebP/GIF by declared type. */
export const imageUpload = (field = "image") =>
  multipartStep({ field, maxBytes: 5 * MB, maxLabel: "5MB", accept: isAllowedImageMime, kind: "image" });

/** Profile pictures are capped lower than other images. */
export const profilePictureUpload = () =>
  multipartStep({ field: "profilePicture", maxBytes: 2 * MB, maxLabel: "2MB", accept: isAllowedImageMime, kind: "image" });

export const coverPictureUpload = () =>
  multipartStep({ field: "coverPicture", maxBytes: 5 * MB, maxLabel: "5MB", accept: isAllowedImageMime, kind: "image" });

export const pdfUpload = () =>
  multipartStep({ field: "pdf", maxBytes: 10 * MB, maxLabel: "10MB", accept: isAllowedPdfMime, kind: "PDF" });

/** Chat attachments: any declared type here, magic bytes are checked when stored. */
export const attachmentUpload = () => multipartStep({ field: "attachment", maxBytes: 10 * MB, maxLabel: "10MB" });
