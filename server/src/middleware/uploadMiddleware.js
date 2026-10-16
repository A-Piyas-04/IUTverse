const multer = require("multer");
const { isAllowedImageMime } = require("../utils/fileValidation");

// Configure storage
const storage = multer.memoryStorage();

// File filter to only allow image uploads
const fileFilter = (req, file, cb) => {
  if (isAllowedImageMime(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

// Create the multer instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter,
});

module.exports = upload;
