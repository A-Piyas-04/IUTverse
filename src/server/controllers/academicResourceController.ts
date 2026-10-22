import "server-only";
import type { Handler } from "../http/context";
import * as response from "../http/responses";
import { json } from "../http/responses";
import * as academicResourceService from "../services/academicResourceService";
import type { ResourceInput } from "../services/academicResourceService";
import * as storageService from "../services/storageService";
import logger from "../utils/logger";
import { canViewContent } from "../utils/contentVisibility";
import { enumValueExact, optionalText, pagination, positiveInt, requiredText } from "../utils/validation";

const validTypes = ["QUESTION", "NOTE", "BOOK", "CLASS_LECTURE", "OTHER", "PDF", "SLIDES", "LAB_MANUAL", "QUESTION_SOLUTION", "LINK", "VIDEO", "DATASET"];

const toTags = (tags: unknown): string[] =>
  Array.isArray(tags) ? tags : String(tags ?? "").split(",").filter(Boolean);

export const createAcademicResource: Handler = async (ctx) => {
  try {
    const { title, type, departmentId, externalLink, courseCode, description, tags } = ctx.body;

    const titleResult = requiredText(title, "Title", { max: 160 });
    if (!titleResult.ok) return response.badRequest(titleResult.error);
    const typeResult = enumValueExact(type, validTypes, "Type");
    if (!typeResult.ok) return response.badRequest(typeResult.error);
    const departmentResult = positiveInt(departmentId, "Department ID");
    if (!departmentResult.ok) return response.badRequest(departmentResult.error);

    if (!ctx.file && !externalLink) {
      return response.badRequest("Either a PDF file or external link must be provided");
    }

    const resourceData: ResourceInput = {
      title: titleResult.value,
      type: typeResult.value,
      departmentId: departmentResult.value,
      externalLink: optionalText(externalLink, { max: 500 }),
      courseCode: optionalText(courseCode, { max: 60 }),
      description: optionalText(description, { max: 3000 }),
      tags: toTags(tags),
      uploadedById: ctx.user!.userId,
    };

    if (ctx.file) {
      const uploaded = await storageService.uploadObject({
        bucket: "academic-resources",
        userId: ctx.user!.userId,
        file: ctx.file,
        prefix: "resource",
      });
      resourceData.filePath = uploaded.path;
      resourceData.fileBucket = uploaded.bucket;
      resourceData.fileMimeType = uploaded.mimeType;
      resourceData.fileSizeBytes = uploaded.size;
    }

    const resource = await academicResourceService.createAcademicResource(resourceData);
    return json(201, {
      success: true,
      message: "Academic resource created successfully",
      data: resource,
    });
  } catch (error: any) {
    logger.error("[AcademicResourceController] Error creating resource:", error);
    return json(500, {
      success: false,
      message: "Error creating academic resource",
      error: error.message,
    });
  }
};

export const getAllAcademicResources: Handler = async (ctx) => {
  try {
    const { departmentId, type, courseCode, search } = ctx.query;
    const filters: { departmentId?: number; type?: string; courseCode?: string | null; search?: string | null } = {};
    if (departmentId) {
      const id = positiveInt(departmentId, "Department ID");
      if (!id.ok) return response.badRequest(id.error);
      filters.departmentId = id.value;
    }
    if (type) {
      const typeResult = enumValueExact(type, validTypes, "Type");
      if (!typeResult.ok) return response.badRequest(typeResult.error);
      filters.type = typeResult.value;
    }
    if (courseCode) filters.courseCode = optionalText(courseCode, { max: 60 });
    if (search) filters.search = optionalText(search, { max: 200 });

    const pageInfo = pagination(ctx.query.page, ctx.query.limit);
    const result = await academicResourceService.getAllAcademicResources(filters, pageInfo);
    return json(200, {
      success: true,
      message: "Academic resources fetched successfully",
      data: result.resources,
      pagination: result.pagination,
    });
  } catch (error: any) {
    logger.error("[AcademicResourceController] Error fetching resources:", error);
    return json(500, {
      success: false,
      message: "Error fetching academic resources",
      error: error.message,
    });
  }
};

export const getAcademicResourceById: Handler = async (ctx) => {
  try {
    const id = positiveInt(ctx.params.id, "Resource ID");
    if (!id.ok) return response.badRequest(id.error);

    const resource = await academicResourceService.getAcademicResourceById(id.value);
    if (!resource || !canViewContent({ status: resource.status, ownerId: resource.uploadedById, viewer: ctx.user })) {
      return json(404, {
        success: false,
        message: "Academic resource not found",
      });
    }

    return json(200, {
      success: true,
      message: "Academic resource fetched successfully",
      data: resource,
    });
  } catch (error: any) {
    logger.error("[AcademicResourceController] Error fetching resource by ID:", error);
    return json(500, {
      success: false,
      message: "Error fetching academic resource",
      error: error.message,
    });
  }
};

export const getAllDepartments: Handler = async () => {
  try {
    const departments = await academicResourceService.getAllDepartments();
    return json(200, {
      success: true,
      message: "Departments fetched successfully",
      data: departments,
    });
  } catch (error: any) {
    logger.error("[AcademicResourceController] Error fetching departments:", error);
    return json(500, {
      success: false,
      message: "Error fetching departments",
      error: error.message,
    });
  }
};

export const createDepartment: Handler = async (ctx) => {
  try {
    const { name } = ctx.body;
    const nameResult = requiredText(name, "Department name", { max: 120 });
    if (!nameResult.ok) return response.badRequest(nameResult.error);

    const department = await academicResourceService.createDepartment(nameResult.value);
    return json(201, {
      success: true,
      message: "Department created successfully",
      data: department,
    });
  } catch (error: any) {
    logger.error("[AcademicResourceController] Error creating department:", error);
    return json(error.code === "23505" ? 400 : 500, {
      success: false,
      message: error.code === "23505" ? "Department name already exists" : "Error creating department",
      error: error.message,
    });
  }
};

export const updateAcademicResource: Handler = async (ctx) => {
  try {
    const { title, type, departmentId, externalLink, courseCode, description, tags } = ctx.body;
    const updateData: ResourceInput = {};
    if (title !== undefined) {
      const titleResult = requiredText(title, "Title", { max: 160 });
      if (!titleResult.ok) return response.badRequest(titleResult.error);
      updateData.title = titleResult.value;
    }
    if (type !== undefined) {
      const typeResult = enumValueExact(type, validTypes, "Type");
      if (!typeResult.ok) return response.badRequest(typeResult.error);
      updateData.type = typeResult.value;
    }
    if (departmentId !== undefined) {
      const departmentResult = positiveInt(departmentId, "Department ID");
      if (!departmentResult.ok) return response.badRequest(departmentResult.error);
      updateData.departmentId = departmentResult.value;
    }
    if (externalLink !== undefined) updateData.externalLink = optionalText(externalLink, { max: 500 });
    if (courseCode !== undefined) updateData.courseCode = optionalText(courseCode, { max: 60 });
    if (description !== undefined) updateData.description = optionalText(description, { max: 3000 });
    if (tags !== undefined) updateData.tags = toTags(tags);

    if (ctx.file) {
      const uploaded = await storageService.uploadObject({
        bucket: "academic-resources",
        userId: ctx.user!.userId,
        file: ctx.file,
        prefix: "resource",
      });
      updateData.filePath = uploaded.path;
      updateData.fileBucket = uploaded.bucket;
      updateData.fileMimeType = uploaded.mimeType;
      updateData.fileSizeBytes = uploaded.size;
    }

    const id = positiveInt(ctx.params.id, "Resource ID");
    if (!id.ok) return response.badRequest(id.error);

    const resource = await academicResourceService.updateAcademicResource(
      id.value,
      updateData,
      ctx.user!.userId
    );

    return json(200, {
      success: true,
      message: "Academic resource updated successfully",
      data: resource,
    });
  } catch (error: any) {
    logger.error("[AcademicResourceController] Error updating resource:", error);
    const status = error.message.includes("Unauthorized") ? 403 : error.message.includes("not found") ? 404 : 500;
    return json(status, {
      success: false,
      message: error.message,
      error: error.message,
    });
  }
};

export const deleteAcademicResource: Handler = async (ctx) => {
  try {
    const id = positiveInt(ctx.params.id, "Resource ID");
    if (!id.ok) return response.badRequest(id.error);

    await academicResourceService.deleteAcademicResource(id.value, ctx.user!.userId);
    return json(200, {
      success: true,
      message: "Academic resource deleted successfully",
    });
  } catch (error: any) {
    logger.error("[AcademicResourceController] Error deleting resource:", error);
    const status = error.message.includes("Unauthorized") ? 403 : error.message.includes("not found") ? 404 : 500;
    return json(status, {
      success: false,
      message: error.message,
      error: error.message,
    });
  }
};
