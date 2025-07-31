import { authUtils } from "../utils/auth.js";

const API_BASE_URL = "/api/academic";

class AcademicResourceApi {
  // Get all departments
  async getDepartments() {
    try {
      const response = await fetch(`${API_BASE_URL}/departments`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching departments:", error);
      throw error;
    }
  }

  // Create a new department (admin only)
  async createDepartment(name) {
    try {
      const response = await fetch(`${API_BASE_URL}/departments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authUtils.getAuthHeader(),
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error creating department:", error);
      throw error;
    }
  }

  // Get all resources with optional filtering
  async getResources(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (filters.departmentId)
        queryParams.append("departmentId", filters.departmentId);
      if (filters.type) queryParams.append("type", filters.type);

      const url = `${API_BASE_URL}/resources${
        queryParams.toString() ? `?${queryParams.toString()}` : ""
      }`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching resources:", error);
      throw error;
    }
  }

  // Get resource by ID
  async getResourceById(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/resources/${id}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching resource:", error);
      throw error;
    }
  }

  // Create a new resource
  async createResource(resourceData) {
    try {
      const formData = new FormData();

      // Add text fields
      formData.append("title", resourceData.title);
      formData.append("type", resourceData.type);
      formData.append("departmentId", resourceData.departmentId);

      if (resourceData.externalLink) {
        formData.append("externalLink", resourceData.externalLink);
      }

      // Add file if provided
      if (resourceData.file) {
        formData.append("pdf", resourceData.file);
      }

      const response = await fetch(`${API_BASE_URL}/resources`, {
        method: "POST",
        headers: {
          ...authUtils.getAuthHeader(),
          // Don't set Content-Type for FormData, let browser set it with boundary
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error creating resource:", error);
      throw error;
    }
  }

  // Update a resource
  async updateResource(id, resourceData) {
    try {
      const formData = new FormData();

      // Add text fields only if they exist
      if (resourceData.title) formData.append("title", resourceData.title);
      if (resourceData.type) formData.append("type", resourceData.type);
      if (resourceData.departmentId)
        formData.append("departmentId", resourceData.departmentId);
      if (resourceData.externalLink !== undefined)
        formData.append("externalLink", resourceData.externalLink);

      // Add file if provided
      if (resourceData.file) {
        formData.append("pdf", resourceData.file);
      }

      const response = await fetch(`${API_BASE_URL}/resources/${id}`, {
        method: "PUT",
        headers: {
          ...authUtils.getAuthHeader(),
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error updating resource:", error);
      throw error;
    }
  }

  // Delete a resource
  async deleteResource(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/resources/${id}`, {
        method: "DELETE",
        headers: {
          ...authUtils.getAuthHeader(),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error deleting resource:", error);
      throw error;
    }
  }

  // Get file URL
  getFileUrl(filename) {
    return `/files/${filename}`;
  }
}

export const academicResourceApi = new AcademicResourceApi();
