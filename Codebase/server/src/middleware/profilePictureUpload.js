const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configure storage for profile pictures
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../../uploads/profiles");

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
    cb(null, `user_${userId}_${uniqueSuffix}${extension}`);
  },
});

// File filter to only allow image uploads
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed for profile pictures!"), false);
  }
};

// Create the multer instance
const profilePictureUpload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit for profile pictures
  },
  fileFilter: fileFilter,
});

module.exports = profilePictureUpload;
