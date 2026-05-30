const multer = require("multer");
const { isAllowedPdfMime } = require("../utils/fileValidation");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (isAllowedPdfMime(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed!"), false);
  }
};

const uploadPdf = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const handlePdfUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large. Maximum size is 10MB.",
      });
    }
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: "Unexpected field name for file upload.",
      });
    }
  }

  if (error.message === "Only PDF files are allowed!") {
    return res.status(400).json({
      success: false,
      message: "Only PDF files are allowed.",
    });
  }

  next(error);
};

module.exports = uploadPdf;
module.exports.handlePdfUploadError = handlePdfUploadError;
