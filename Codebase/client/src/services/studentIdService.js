/**
 * Student ID API Service
 * Handles all student ID related API calls
 */

class StudentIdService {
  constructor() {
    // Get base URL from environment or use default
    this.baseUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";
  }

  // Get JWT token from localStorage
  getAuthToken() {
    return localStorage.getItem("token");
  }

  // Get request headers with authentication
  getHeaders() {
    const token = this.getAuthToken();
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  // Handle API response
  async handleResponse(response) {
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }

    return data;
  }

  // Update or create student ID
  async updateStudentId(studentId) {
    try {
      const response = await fetch(`${this.baseUrl}/api/user/student-id`, {
        method: "PUT",
        headers: this.getHeaders(),
        body: JSON.stringify({ studentId }),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error("Error updating student ID:", error);
      throw error;
    }
  }

  // Get current user's student ID
  async getStudentId() {
    try {
      const response = await fetch(`${this.baseUrl}/api/user/student-id`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error("Error getting student ID:", error);
      throw error;
    }
  }

  // Delete student ID
  async deleteStudentId() {
    try {
      const response = await fetch(`${this.baseUrl}/api/user/student-id`, {
        method: "DELETE",
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error("Error deleting student ID:", error);
      throw error;
    }
  }

  // Check student ID availability
  async checkStudentIdAvailability(studentId) {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/user/student-id/check/${encodeURIComponent(
          studentId
        )}`,
        {
          method: "GET",
          headers: this.getHeaders(),
        }
      );

      return await this.handleResponse(response);
    } catch (error) {
      console.error("Error checking student ID availability:", error);
      throw error;
    }
  }

  // Get user by student ID
  async getUserByStudentId(studentId) {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/user/by-student-id/${encodeURIComponent(
          studentId
        )}`,
        {
          method: "GET",
          headers: this.getHeaders(),
        }
      );

      return await this.handleResponse(response);
    } catch (error) {
      console.error("Error getting user by student ID:", error);
      throw error;
    }
  }

  // Validate student ID format on client side
  validateStudentId(studentId) {
    const errors = [];

    if (
      !studentId ||
      typeof studentId !== "string" ||
      studentId.trim().length === 0
    ) {
      errors.push("Student ID is required");
      return errors;
    }

    const trimmed = studentId.trim();

    if (trimmed.length < 3 || trimmed.length > 20) {
      errors.push("Student ID must be between 3 and 20 characters long");
    }

    if (!/^[A-Za-z0-9-]+$/.test(trimmed)) {
      errors.push("Student ID can only contain letters, numbers, and hyphens");
    }

    return errors;
  }

  // Debounced availability check (useful for real-time validation)
  debounceAvailabilityCheck(studentId, callback, delay = 500) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(async () => {
      try {
        const result = await this.checkStudentIdAvailability(studentId);
        callback(null, result);
      } catch (error) {
        callback(error, null);
      }
    }, delay);
  }
}

export default new StudentIdService();
