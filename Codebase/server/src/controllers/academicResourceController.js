const academicResourceService = require("../services/academicResourceService");
const storageService = require("../services/storageService");

const validTypes = ["QUESTION", "NOTE", "BOOK", "CLASS_LECTURE", "OTHER"];

const createAcademicResource = async (req, res) => {
  try {
    const { title, type, departmentId, externalLink, courseCode } = req.body;

    if (!title || !type || !departmentId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: title, type, and departmentId are required",
      });
    }

    if (!req.file && !externalLink) {
      return res.status(400).json({
        success: false,
        message: "Either a PDF file or external link must be provided",
      });
    }

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid type. Must be one of: ${validTypes.join(", ")}`,
      });
    }

    const resourceData = {
      title,
      type,
      departmentId: Number(departmentId),
      externalLink: externalLink || null,
      courseCode: courseCode || null,
      uploadedById: req.user.userId,
    };

    if (req.file) {
      const uploaded = await storageService.uploadObject({
        bucket: "academic-resources",
        userId: req.user.userId,
        file: req.file,
        prefix: "resource",
      });
      resourceData.filePath = uploaded.path;
      resourceData.fileBucket = uploaded.bucket;
      resourceData.fileMimeType = uploaded.mimeType;
      resourceData.fileSizeBytes = uploaded.size;
    }

    const resource = await academicResourceService.createAcademicResource(resourceData);
    res.status(201).json({
      success: true,
      message: "Academic resource created successfully",
      data: resource,
    });
  } catch (error) {
    console.error("[AcademicResourceController] Error creating resource:", error);
    res.status(500).json({
      success: false,
      message: "Error creating academic resource",
      error: error.message,
    });
  }
};

const getAllAcademicResources = async (req, res) => {
  try {
    const { departmentId, type, courseCode } = req.query;
    const filters = {};
    if (departmentId) filters.departmentId = departmentId;
    if (type) filters.type = type;
    if (courseCode) filters.courseCode = courseCode;

    const resources = await academicResourceService.getAllAcademicResources(filters);
    res.json({
      success: true,
      message: "Academic resources fetched successfully",
      data: resources,
    });
  } catch (error) {
    console.error("[AcademicResourceController] Error fetching resources:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching academic resources",
      error: error.message,
    });
  }
};

const getAcademicResourceById = async (req, res) => {
  try {
    const resource = await academicResourceService.getAcademicResourceById(req.params.id);
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
    console.error("[AcademicResourceController] Error fetching resource by ID:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching academic resource",
      error: error.message,
    });
  }
};

const getAllDepartments = async (req, res) => {
  try {
    const departments = await academicResourceService.getAllDepartments();
    res.json({
      success: true,
      message: "Departments fetched successfully",
      data: departments,
    });
  } catch (error) {
    console.error("[AcademicResourceController] Error fetching departments:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching departments",
      error: error.message,
    });
  }
};

const createDepartment = async (req, res) => {
  try {
    const { name } = req.body;
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
    console.error("[AcademicResourceController] Error creating department:", error);
    res.status(error.code === "23505" ? 400 : 500).json({
      success: false,
      message: error.code === "23505" ? "Department name already exists" : "Error creating department",
      error: error.message,
    });
  }
};

const updateAcademicResource = async (req, res) => {
  try {
    const { title, type, departmentId, externalLink, courseCode } = req.body;
    const updateData = {};
    if (title) updateData.title = title;
    if (type) updateData.type = type;
    if (departmentId) updateData.departmentId = Number(departmentId);
    if (externalLink !== undefined) updateData.externalLink = externalLink;
    if (courseCode !== undefined) updateData.courseCode = courseCode;

    if (req.file) {
      const uploaded = await storageService.uploadObject({
        bucket: "academic-resources",
        userId: req.user.userId,
        file: req.file,
        prefix: "resource",
      });
      updateData.filePath = uploaded.path;
      updateData.fileBucket = uploaded.bucket;
      updateData.fileMimeType = uploaded.mimeType;
      updateData.fileSizeBytes = uploaded.size;
    }

    const resource = await academicResourceService.updateAcademicResource(
      req.params.id,
      updateData,
      req.user.userId
    );

    res.json({
      success: true,
      message: "Academic resource updated successfully",
      data: resource,
    });
  } catch (error) {
    console.error("[AcademicResourceController] Error updating resource:", error);
    const status = error.message.includes("Unauthorized") ? 403 : error.message.includes("not found") ? 404 : 500;
    res.status(status).json({
      success: false,
      message: error.message,
      error: error.message,
    });
  }
};

const deleteAcademicResource = async (req, res) => {
  try {
    await academicResourceService.deleteAcademicResource(req.params.id, req.user.userId);
    res.json({
      success: true,
      message: "Academic resource deleted successfully",
    });
  } catch (error) {
    console.error("[AcademicResourceController] Error deleting resource:", error);
    const status = error.message.includes("Unauthorized") ? 403 : error.message.includes("not found") ? 404 : 500;
    res.status(status).json({
      success: false,
      message: error.message,
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
