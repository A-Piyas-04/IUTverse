const multer = require("multer");
const { badRequest } = require("../utils/responses");

const uploadErrorHandler =
  ({ fileType = "file", maxSize = null } = {}) =>
  (error, req, res, next) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        const suffix = maxSize ? ` Maximum size is ${maxSize}.` : "";
        return badRequest(res, `File too large.${suffix}`);
      }
      if (error.code === "LIMIT_UNEXPECTED_FILE") {
        return badRequest(res, "Unexpected field name for file upload.");
      }
      return badRequest(res, error.message);
    }

    if (/only .*files? are allowed/i.test(error.message) || /only .*uploads?/i.test(error.message)) {
      return badRequest(res, `Only ${fileType} files are allowed.`);
    }

    return next(error);
  };

const imageUploadErrorHandler = uploadErrorHandler({ fileType: "image", maxSize: "5MB" });
const profileImageUploadErrorHandler = uploadErrorHandler({ fileType: "image", maxSize: "2MB" });
const pdfUploadErrorHandler = uploadErrorHandler({ fileType: "PDF", maxSize: "10MB" });

module.exports = {
  imageUploadErrorHandler,
  pdfUploadErrorHandler,
  profileImageUploadErrorHandler,
  uploadErrorHandler,
};
