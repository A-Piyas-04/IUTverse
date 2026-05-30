const academicResourceService = require("../services/academicResourceService");
const storageService = require("../services/storageService");
const response = require("../utils/responses");
const logger = require("../utils/logger");
const { enumValueExact, optionalText, pagination, positiveInt, requiredText } = require("../utils/validation");

const validTypes = ["QUESTION", "NOTE", "BOOK", "CLASS_LECTURE", "OTHER"];

const createAcademicResource = async (req, res) => {
  try {
    const { title, type, departmentId, externalLink, courseCode } = req.body;

    const titleResult = requiredText(title, "Title", { max: 160 });
    if (titleResult.error) return response.badRequest(res, titleResult.error);
    const typeResult = enumValueExact(type, validTypes, "Type");
    if (typeResult.error) return response.badRequest(res, typeResult.error);
    const departmentResult = positiveInt(departmentId, "Department ID");
    if (departmentResult.error) return response.badRequest(res, departmentResult.error);

    if (!req.file && !externalLink) {
      return response.badRequest(res, "Either a PDF file or external link must be provided");
    }

    const resourceData = {
      title: titleResult.value,
      type: typeResult.value,
      departmentId: departmentResult.value,
      externalLink: optionalText(externalLink, { max: 500 }),
      courseCode: optionalText(courseCode, { max: 60 }),
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
    logger.error("[AcademicResourceController] Error creating resource:", error);
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
    if (departmentId) {
      const id = positiveInt(departmentId, "Department ID");
      if (id.error) return response.badRequest(res, id.error);
      filters.departmentId = id.value;
    }
    if (type) {
      const typeResult = enumValueExact(type, validTypes, "Type");
      if (typeResult.error) return response.badRequest(res, typeResult.error);
      filters.type = typeResult.value;
    }
    if (courseCode) filters.courseCode = optionalText(courseCode, { max: 60 });

    const pageInfo = pagination(req.query.page, req.query.limit);
    const result = await academicResourceService.getAllAcademicResources(filters, pageInfo);
    res.json({
      success: true,
      message: "Academic resources fetched successfully",
      data: result.resources,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error("[AcademicResourceController] Error fetching resources:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching academic resources",
      error: error.message,
    });
  }
};

const getAcademicResourceById = async (req, res) => {
  try {
    const id = positiveInt(req.params.id, "Resource ID");
    if (id.error) return response.badRequest(res, id.error);

    const resource = await academicResourceService.getAcademicResourceById(id.value);
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
    logger.error("[AcademicResourceController] Error fetching resource by ID:", error);
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
    logger.error("[AcademicResourceController] Error fetching departments:", error);
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
    const nameResult = requiredText(name, "Department name", { max: 120 });
    if (nameResult.error) return response.badRequest(res, nameResult.error);

    const department = await academicResourceService.createDepartment(nameResult.value);
    res.status(201).json({
      success: true,
      message: "Department created successfully",
      data: department,
    });
  } catch (error) {
    logger.error("[AcademicResourceController] Error creating department:", error);
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
    if (title !== undefined) {
      const titleResult = requiredText(title, "Title", { max: 160 });
      if (titleResult.error) return response.badRequest(res, titleResult.error);
      updateData.title = titleResult.value;
    }
    if (type !== undefined) {
      const typeResult = enumValueExact(type, validTypes, "Type");
      if (typeResult.error) return response.badRequest(res, typeResult.error);
      updateData.type = typeResult.value;
    }
    if (departmentId !== undefined) {
      const departmentResult = positiveInt(departmentId, "Department ID");
      if (departmentResult.error) return response.badRequest(res, departmentResult.error);
      updateData.departmentId = departmentResult.value;
    }
    if (externalLink !== undefined) updateData.externalLink = optionalText(externalLink, { max: 500 });
    if (courseCode !== undefined) updateData.courseCode = optionalText(courseCode, { max: 60 });

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

    const id = positiveInt(req.params.id, "Resource ID");
    if (id.error) return response.badRequest(res, id.error);

    const resource = await academicResourceService.updateAcademicResource(
      id.value,
      updateData,
      req.user.userId
    );

    res.json({
      success: true,
      message: "Academic resource updated successfully",
      data: resource,
    });
  } catch (error) {
    logger.error("[AcademicResourceController] Error updating resource:", error);
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
    const id = positiveInt(req.params.id, "Resource ID");
    if (id.error) return response.badRequest(res, id.error);

    await academicResourceService.deleteAcademicResource(id.value, req.user.userId);
    res.json({
      success: true,
      message: "Academic resource deleted successfully",
    });
  } catch (error) {
    logger.error("[AcademicResourceController] Error deleting resource:", error);
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
