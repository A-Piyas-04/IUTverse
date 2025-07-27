// Authentication utilities
const AUTH_TOKEN_KEY = 'iutverse_auth_token';
const USER_DATA_KEY = 'iutverse_user_data';

export const authUtils = {
  // Store authentication data
  setAuthData(token, userData) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
  },

  // Get stored token
  getToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  },

  // Get stored user data
  getUserData() {
    const userData = localStorage.getItem(USER_DATA_KEY);
    return userData ? JSON.parse(userData) : null;
  },

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.getToken();
  },

  // Clear authentication data
  clearAuthData() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
  },

  // Get authorization header
  getAuthHeader() {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
};
