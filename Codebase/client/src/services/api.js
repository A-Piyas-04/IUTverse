// API service for making requests to the backend
import { authUtils } from "../utils/auth.js";

const API_BASE_URL = "/api";

class ApiService {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        "Content-Type": "application/json",
        ...authUtils.getAuthHeader(),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      // Check if response is JSON before parsing
      const contentType = response.headers.get("content-type");
      let data;

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        // If not JSON, get text content for error handling
        const textData = await response.text();
        data = {
          message: `Non-JSON response: ${textData.substring(0, 100)}...`,
        };
      }

      if (!response.ok) {
        // If unauthorized, clear auth data and redirect to login
        if (response.status === 401 || response.status === 403) {
          // Import auth context dynamically to avoid circular imports
          try {
            authUtils.clearAuthData();
            // Force a page reload to reinitialize auth state
            window.location.href = "/login";
          } catch (error) {
            console.error("Error clearing auth data:", error);
          }
        }
        throw new Error(
          data.message || `HTTP error! status: ${response.status}`
        );
      }

      return { success: true, data };
    } catch (error) {
      console.error("API request failed:", error);
      return { success: false, error: error.message };
    }
  }

  // Auth endpoints
  async login(email, password) {
    return this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async signup(email) {
    return this.request("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async getAllUsers() {
    return this.request("/auth/users", {
      method: "GET",
    });
  }

  async validateToken() {
    return this.request("/auth/validate", {
      method: "GET",
    });
  }

  // User endpoints
  async getProfile() {
    return this.request("/profile", {
      method: "GET",
    });
  }

  async getDashboard() {
    return this.request("/dashboard", {
      method: "GET",
    });
  }

  // Profile endpoints
  async getProfileByUserId(userId) {
    return this.request(`/profile/${userId}`, {
      method: "GET",
    });
  }

  async createProfile(profileData) {
    return this.request("/profile", {
      method: "POST",
      body: JSON.stringify(profileData),
    });
  }

  async updateProfile(profileData) {
    return this.request("/profile", {
      method: "PUT",
      body: JSON.stringify(profileData),
    });
  }

  // Update user name
  async updateUserName(name) {
    return this.request("/user", {
      method: "PUT",
      body: JSON.stringify({ name }),
    });
  }

  // Get user by ID (for future use)
  async getUserById(userId) {
    return this.request(`/user/${userId}`, {
      method: "GET",
    });
  }

  // Job endpoints
  async getJobs() {
    return this.request("/jobs", { method: "GET" });
  }

  async createJob(jobData) {
    return this.request("/jobs", {
      method: "POST",
      body: JSON.stringify(jobData),
    });
  }

  // Job Comment endpoints
  async getJobComments(jobId) {
    return this.request(`/jobs/${jobId}/comments`, {
      method: "GET",
    });
  }

  async createJobComment(jobId, content) {
    return this.request(`/jobs/${jobId}/comments`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  }

  async replyToComment(jobId, commentId, content) {
    return this.request(`/jobs/${jobId}/comments/${commentId}/reply`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  }

  async updateJobComment(commentId, content) {
    return this.request(`/jobs/comments/${commentId}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    });
  }

  async deleteJobComment(commentId) {
    return this.request(`/jobs/comments/${commentId}`, {
      method: "DELETE",
    });
  }

  async getJobCommentById(commentId) {
    return this.request(`/jobs/comments/${commentId}`, {
      method: "GET",
    });
  }
}

export default new ApiService();
