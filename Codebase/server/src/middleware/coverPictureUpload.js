const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configure storage for cover pictures
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../../uploads/covers");

    // Create the directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate a unique filename with user ID prefix for easier management
    const userId = req.user.userId;
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    cb(null, `user_${userId}_cover_${uniqueSuffix}${extension}`);
  },
});

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
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for cover pictures (larger than profile pictures)
  },
  fileFilter: fileFilter,
});

module.exports = coverPictureUpload;
