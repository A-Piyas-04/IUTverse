// API service for making requests to the backend
import { authUtils } from '../utils/auth.js';

const API_BASE_URL = '/api';

class ApiService {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...authUtils.getAuthHeader(),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        // If unauthorized, clear auth data and redirect to login
        if (response.status === 401 || response.status === 403) {
          authUtils.clearAuthData();
          window.location.href = '/login';
        }
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return { success: true, data };
    } catch (error) {
      console.error('API request failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Auth endpoints
  async login(email, password) {
    return this.request('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async signup(email) {
    return this.request('/signup', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async getAllUsers() {
    return this.request('/users', {
      method: 'GET',
    });
  }

  // User endpoints
  async getProfile() {
    return this.request('/profile', {
      method: 'GET',
    });
  }

  async getDashboard() {
    return this.request('/dashboard', {
      method: 'GET',
    });
  }
}

export default new ApiService();
