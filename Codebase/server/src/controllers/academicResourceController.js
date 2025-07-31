const academicResourceService = require("../services/academicResourceService");
const fs = require("fs");
const path = require("path");

// Create a new academic resource
const createAcademicResource = async (req, res) => {
  try {
    const { title, type, departmentId, externalLink, courseCode } = req.body;

    console.log("[AcademicResourceController] Creating resource:", {
      title,
      type,
      departmentId,
      externalLink,
      courseCode,
      hasFile: !!req.file,
    });

    // Validate required fields
    if (!title || !type || !departmentId) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: title, type, and departmentId are required",
      });
    }

    // Validate that either file or external link is provided
    if (!req.file && !externalLink) {
      return res.status(400).json({
        success: false,
        message: "Either a PDF file or external link must be provided",
      });
    }

    // Validate ResourceType enum
    const validTypes = ["QUESTION", "NOTE", "BOOK", "CLASS_LECTURE", "OTHER"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid type. Must be one of: ${validTypes.join(", ")}`,
      });
    }

    // Prepare resource data
    const resourceData = {
      title,
      type,
      departmentId: parseInt(departmentId),
      externalLink: externalLink || null,
      courseCode: courseCode || null,
      fileUrl: null,
    };

    // If file was uploaded, set the fileUrl
    if (req.file) {
      resourceData.fileUrl = `/files/${req.file.filename}`;
    }

    const resource = await academicResourceService.createAcademicResource(
      resourceData
    );

    console.log(
      "[AcademicResourceController] Resource created successfully:",
      resource
    );
    res.status(201).json({
      success: true,
      message: "Academic resource created successfully",
      data: resource,
    });
  } catch (error) {
    console.error(
      "[AcademicResourceController] Error creating resource:",
      error
    );

    // Clean up uploaded file if database operation failed
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
        console.log(
          "[AcademicResourceController] Cleaned up uploaded file after error"
        );
      } catch (unlinkError) {
        console.error(
          "[AcademicResourceController] Error cleaning up file:",
          unlinkError
        );
      }
    }

    res.status(500).json({
      success: false,
      message: "Error creating academic resource",
      error: error.message,
    });
  }
};

// Get all academic resources with optional filtering
const getAllAcademicResources = async (req, res) => {
  try {
    const { departmentId, type, courseCode } = req.query;

    console.log(
      "[AcademicResourceController] Fetching resources with filters:",
      { departmentId, type, courseCode }
    );

    const filters = {};
    if (departmentId) filters.departmentId = departmentId;
    if (type) filters.type = type;
    if (courseCode) filters.courseCode = courseCode;

    const resources = await academicResourceService.getAllAcademicResources(
      filters
    );

    res.json({
      success: true,
      message: "Academic resources fetched successfully",
      data: resources,
    });
  } catch (error) {
    console.error(
      "[AcademicResourceController] Error fetching resources:",
      error
    );
    res.status(500).json({
      success: false,
      message: "Error fetching academic resources",
      error: error.message,
    });
  }
};

// Get academic resource by ID
const getAcademicResourceById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("[AcademicResourceController] Fetching resource by ID:", id);

    const resource = await academicResourceService.getAcademicResourceById(id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Academic resource not found",
      });
    }

    res.json({
      success: true,
      message: "Academic resource fetched successfully",
      data: resource,
    });
  } catch (error) {
    console.error(
      "[AcademicResourceController] Error fetching resource by ID:",
      error
    );
    res.status(500).json({
      success: false,
      message: "Error fetching academic resource",
      error: error.message,
    });
  }
};

// Get all departments
const getAllDepartments = async (req, res) => {
  try {
    console.log("[AcademicResourceController] Fetching all departments");

    const departments = await academicResourceService.getAllDepartments();

    res.json({
      success: true,
      message: "Departments fetched successfully",
      data: departments,
    });
  } catch (error) {
    console.error(
      "[AcademicResourceController] Error fetching departments:",
      error
    );
    res.status(500).json({
      success: false,
      message: "Error fetching departments",
      error: error.message,
    });
  }
};

// Create a new department
const createDepartment = async (req, res) => {
  try {
    const { name } = req.body;

    console.log("[AcademicResourceController] Creating department:", name);

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Department name is required",
      });
    }

    const department = await academicResourceService.createDepartment(name);

    res.status(201).json({
      success: true,
      message: "Department created successfully",
      data: department,
    });
  } catch (error) {
    console.error(
      "[AcademicResourceController] Error creating department:",
      error
    );

    if (error.code === "P2002") {
      return res.status(400).json({
        success: false,
        message: "Department name already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error creating department",
      error: error.message,
    });
  }
};

// Update academic resource
const updateAcademicResource = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, type, departmentId, externalLink, courseCode } = req.body;

    console.log(
      "[AcademicResourceController] Updating resource:",
      id,
      req.body
    );

    // Check if resource exists
    const existingResource =
      await academicResourceService.getAcademicResourceById(id);
    if (!existingResource) {
      return res.status(404).json({
        success: false,
        message: "Academic resource not found",
      });
    }

    // Prepare update data
    const updateData = {};
    if (title) updateData.title = title;
    if (type) updateData.type = type;
    if (departmentId) updateData.departmentId = parseInt(departmentId);
    if (externalLink !== undefined) updateData.externalLink = externalLink;
    if (courseCode !== undefined) updateData.courseCode = courseCode;

    // If new file was uploaded, update fileUrl and remove old file
    if (req.file) {
      updateData.fileUrl = `/files/${req.file.filename}`;

      // Remove old file if it exists
      if (existingResource.fileUrl) {
        const oldFilePath = path.join(
          __dirname,
          "../../uploads",
          path.basename(existingResource.fileUrl)
        );
        try {
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
            console.log(
              "[AcademicResourceController] Removed old file:",
              oldFilePath
            );
          }
        } catch (error) {
          console.error(
            "[AcademicResourceController] Error removing old file:",
            error
          );
        }
      }
    }

    const resource = await academicResourceService.updateAcademicResource(
      id,
      updateData
    );

    res.json({
      success: true,
      message: "Academic resource updated successfully",
      data: resource,
    });
  } catch (error) {
    console.error(
      "[AcademicResourceController] Error updating resource:",
      error
    );

    // Clean up uploaded file if database operation failed
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
        console.log(
          "[AcademicResourceController] Cleaned up uploaded file after error"
        );
      } catch (unlinkError) {
        console.error(
          "[AcademicResourceController] Error cleaning up file:",
          unlinkError
        );
      }
    }

    res.status(500).json({
      success: false,
      message: "Error updating academic resource",
      error: error.message,
    });
  }
};

// Delete academic resource
const deleteAcademicResource = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("[AcademicResourceController] Deleting resource:", id);

    // Get resource first to check if file needs to be deleted
    const resource = await academicResourceService.getAcademicResourceById(id);
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Academic resource not found",
      });
    }

    // Delete the resource from database
    await academicResourceService.deleteAcademicResource(id);

    // Remove associated file if it exists
    if (resource.fileUrl) {
      const filePath = path.join(
        __dirname,
        "../../uploads",
        path.basename(resource.fileUrl)
      );
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log("[AcademicResourceController] Removed file:", filePath);
        }
      } catch (error) {
        console.error(
          "[AcademicResourceController] Error removing file:",
          error
        );
      }
    }

    res.json({
      success: true,
      message: "Academic resource deleted successfully",
    });
  } catch (error) {
    console.error(
      "[AcademicResourceController] Error deleting resource:",
      error
    );
    res.status(500).json({
      success: false,
      message: "Error deleting academic resource",
      error: error.message,
    });
  }
};

module.exports = {
  createAcademicResource,
  getAllAcademicResources,
  getAcademicResourceById,
  getAllDepartments,
  createDepartment,
  updateAcademicResource,
  deleteAcademicResource,
};
