const express = require("express");
const router = express.Router();
const academicResourceController = require("../controllers/academicResourceController");
const { authenticateToken } = require("../middleware/auth");
const uploadPdf = require("../middleware/uploadPdf");

// Get all departments (public route)
router.get("/departments", academicResourceController.getAllDepartments);

// Create a new department (protected route)
router.post(
  "/departments",
  authenticateToken,
  academicResourceController.createDepartment
);

// Get all academic resources with optional filtering (public route)
router.get("/resources", academicResourceController.getAllAcademicResources);

// Get academic resource by ID (public route)
router.get(
  "/resources/:id",
  academicResourceController.getAcademicResourceById
);

// Create a new academic resource (protected route)
// The 'pdf' field name should match the frontend form field
router.post(
  "/resources",
  authenticateToken,
  uploadPdf.single("pdf"),
  uploadPdf.handlePdfUploadError,
  academicResourceController.createAcademicResource
);

// Update academic resource (protected route)
router.put(
  "/resources/:id",
  authenticateToken,
  uploadPdf.single("pdf"),
  uploadPdf.handlePdfUploadError,
  academicResourceController.updateAcademicResource
);

// Delete academic resource (protected route)
router.delete(
  "/resources/:id",
  authenticateToken,
  academicResourceController.deleteAcademicResource
);

module.exports = router;
