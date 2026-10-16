const multer = require("multer");
const { isAllowedImageMime } = require("../utils/fileValidation");
const storage = multer.memoryStorage();

// File filter to only allow image uploads
const fileFilter = (req, file, cb) => {
  if (isAllowedImageMime(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed for cover pictures!"), false);
  }
};

// Create the multer instance
const coverPictureUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for cover pictures (larger than profile pictures)
  },
  fileFilter: fileFilter,
});

module.exports = coverPictureUpload;
