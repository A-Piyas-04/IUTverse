const multer = require("multer");
const storage = multer.memoryStorage();

// File filter to only allow image uploads
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
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
