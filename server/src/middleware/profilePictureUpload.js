const multer = require("multer");
const { isAllowedImageMime } = require("../utils/fileValidation");
const storage = multer.memoryStorage();

// File filter to only allow image uploads
const fileFilter = (req, file, cb) => {
  if (isAllowedImageMime(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed for profile pictures!"), false);
  }
};

// Create the multer instance
const profilePictureUpload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit for profile pictures
  },
  fileFilter: fileFilter,
});

module.exports = profilePictureUpload;
