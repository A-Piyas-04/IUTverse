const fs = require("fs").promises;
const path = require("path");
const { v4: uuidv4 } = require("uuid");

class FileUploadService {
  constructor() {
    this.uploadDir = path.join(__dirname, "../../uploads");
    this.profilePicturesDir = path.join(this.uploadDir, "profile-pictures");
    this.coverPicturesDir = path.join(this.uploadDir, "cover-pictures");
    this.initDirectories();
  }

  async initDirectories() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(this.profilePicturesDir, { recursive: true });
      await fs.mkdir(this.coverPicturesDir, { recursive: true });
    } catch (error) {
      console.error("Error creating upload directories:", error);
    }
  }

  // Generate unique filename
  generateFileName(originalName) {
    const ext = path.extname(originalName);
    const uniqueName = `${uuidv4()}${ext}`;
    return uniqueName;
  }

  // Save profile picture
  async saveProfilePicture(fileBuffer, originalName) {
    try {
      const fileName = this.generateFileName(originalName);
      const filePath = path.join(this.profilePicturesDir, fileName);

      await fs.writeFile(filePath, fileBuffer);

      // Return relative path for database storage
      return `/uploads/profile-pictures/${fileName}`;
    } catch (error) {
      console.error("Error saving profile picture:", error);
      throw new Error("Failed to save profile picture");
    }
  }

  // Save cover picture
  async saveCoverPicture(fileBuffer, originalName) {
    try {
      const fileName = this.generateFileName(originalName);
      const filePath = path.join(this.coverPicturesDir, fileName);

      await fs.writeFile(filePath, fileBuffer);

      // Return relative path for database storage
      return `/uploads/cover-pictures/${fileName}`;
    } catch (error) {
      console.error("Error saving cover picture:", error);
      throw new Error("Failed to save cover picture");
    }
  }

  // Delete file
  async deleteFile(filePath) {
    try {
      if (!filePath) return;

      // Convert relative path to absolute path
      const absolutePath = path.join(__dirname, "../..", filePath);

      // Check if file exists before deleting
      try {
        await fs.access(absolutePath);
        await fs.unlink(absolutePath);
        console.log(`Deleted file: ${absolutePath}`);
      } catch (error) {
        // File doesn't exist, which is fine
        console.log(`File not found for deletion: ${absolutePath}`);
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      // Don't throw error for file deletion failures
    }
  }

  // Get file absolute path
  getAbsolutePath(relativePath) {
    if (!relativePath) return null;
    return path.join(__dirname, "../..", relativePath);
  }

  // Validate image file
  isValidImageType(mimetype) {
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    return allowedTypes.includes(mimetype);
  }

  // Get file size in MB
  getFileSizeInMB(buffer) {
    return buffer.length / (1024 * 1024);
  }
}

module.exports = new FileUploadService();
