const express = require("express");
const router = express.Router();
const academicResourceController = require("../controllers/academicResourceController");
const { authenticateToken } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/authorization");
const uploadPdf = require("../middleware/uploadPdf");
const { pdfUploadErrorHandler } = require("../middleware/uploadErrors");
const { createLimiter } = require("../middleware/security");

// Get all departments (public route)
router.get("/departments", academicResourceController.getAllDepartments);

// Create a new department (protected route)
router.post(
  "/departments",
  authenticateToken,
  requireAdmin,
  createLimiter,
  academicResourceController.createDepartment
);

// Members only
router.get("/resources", authenticateToken, academicResourceController.getAllAcademicResources);

router.get(
  "/resources/:id",
  authenticateToken,
  academicResourceController.getAcademicResourceById
);

// Create a new academic resource (protected route)
// The 'pdf' field name should match the frontend form field
router.post(
  "/resources",
  authenticateToken,
  createLimiter,
  uploadPdf.single("pdf"),
  pdfUploadErrorHandler,
  academicResourceController.createAcademicResource
);

// Update academic resource (protected route)
router.put(
  "/resources/:id",
  authenticateToken,
  createLimiter,
  uploadPdf.single("pdf"),
  pdfUploadErrorHandler,
  academicResourceController.updateAcademicResource
);

// Delete academic resource (protected route)
router.delete(
  "/resources/:id",
  authenticateToken,
  academicResourceController.deleteAcademicResource
);

module.exports = router;
