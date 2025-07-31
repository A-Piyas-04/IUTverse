const { PrismaClient } = require("@prisma/client");
const path = require("path");

const prisma = new PrismaClient();

// Create a new academic resource
const createAcademicResource = async (resourceData) => {
  try {
    console.log("[AcademicResourceService] Creating resource:", resourceData);

    const resource = await prisma.academicResource.create({
      data: resourceData,
      include: {
        department: true,
      },
    });

    console.log(
      "[AcademicResourceService] Resource created successfully:",
      resource
    );
    return resource;
  } catch (error) {
    console.error("[AcademicResourceService] Error creating resource:", error);
    throw error;
  }
};

// Get all academic resources with optional filtering
const getAllAcademicResources = async (filters = {}) => {
  try {
    const where = {};

    // Add filters if provided
    if (filters.departmentId) {
      where.departmentId = parseInt(filters.departmentId);
    }

    if (filters.type) {
      where.type = filters.type;
    }

    console.log(
      "[AcademicResourceService] Fetching resources with filters:",
      where
    );

    const resources = await prisma.academicResource.findMany({
      where,
      include: {
        department: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log("[AcademicResourceService] Found resources:", resources.length);
    return resources;
  } catch (error) {
    console.error("[AcademicResourceService] Error fetching resources:", error);
    throw error;
  }
};

// Get academic resource by ID
const getAcademicResourceById = async (id) => {
  try {
    console.log("[AcademicResourceService] Fetching resource by ID:", id);

    const resource = await prisma.academicResource.findUnique({
      where: { id: parseInt(id) },
      include: {
        department: true,
      },
    });

    console.log("[AcademicResourceService] Resource found:", !!resource);
    return resource;
  } catch (error) {
    console.error(
      "[AcademicResourceService] Error fetching resource by ID:",
      error
    );
    throw error;
  }
};

// Get all departments
const getAllDepartments = async () => {
  try {
    console.log("[AcademicResourceService] Fetching all departments");

    const departments = await prisma.department.findMany({
      orderBy: {
        name: "asc",
      },
    });

    console.log(
      "[AcademicResourceService] Found departments:",
      departments.length
    );
    return departments;
  } catch (error) {
    console.error(
      "[AcademicResourceService] Error fetching departments:",
      error
    );
    throw error;
  }
};

// Create a new department
const createDepartment = async (name) => {
  try {
    console.log("[AcademicResourceService] Creating department:", name);

    const department = await prisma.department.create({
      data: { name },
    });

    console.log("[AcademicResourceService] Department created:", department);
    return department;
  } catch (error) {
    console.error(
      "[AcademicResourceService] Error creating department:",
      error
    );
    throw error;
  }
};

// Update academic resource
const updateAcademicResource = async (id, updateData) => {
  try {
    console.log("[AcademicResourceService] Updating resource:", id, updateData);

    const resource = await prisma.academicResource.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        department: true,
      },
    });

    console.log("[AcademicResourceService] Resource updated successfully");
    return resource;
  } catch (error) {
    console.error("[AcademicResourceService] Error updating resource:", error);
    throw error;
  }
};

// Delete academic resource
const deleteAcademicResource = async (id) => {
  try {
    console.log("[AcademicResourceService] Deleting resource:", id);

    const resource = await prisma.academicResource.delete({
      where: { id: parseInt(id) },
    });

    console.log("[AcademicResourceService] Resource deleted successfully");
    return resource;
  } catch (error) {
    console.error("[AcademicResourceService] Error deleting resource:", error);
    throw error;
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
