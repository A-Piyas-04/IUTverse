// Authentication utilities
const AUTH_TOKEN_KEY = 'iutverse_auth_token';
const USER_DATA_KEY = 'iutverse_user_data';

// Helper function to decode JWT without verification (client-side only)
const decodeJWT = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
};

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
    const token = this.getToken();
    if (!token) return false;
    
    // Check if token is expired
    if (this.isTokenExpired(token)) {
      this.clearAuthData();
      return false;
    }
    
    return true;
  },

  // Check if token is expired
  isTokenExpired(token) {
    if (!token) return true;
    
    const decoded = decodeJWT(token);
    if (!decoded || !decoded.exp) return true;
    
    // Check if token expires within the next 5 minutes (buffer time)
    const currentTime = Math.floor(Date.now() / 1000);
    const bufferTime = 5 * 60; // 5 minutes in seconds
    
    return decoded.exp < (currentTime + bufferTime);
  },

  // Validate token with server
  async validateTokenWithServer() {
    const token = this.getToken();
    if (!token) return false;

    try {
      // Import API service dynamically to avoid circular imports
      const { default: ApiService } = await import('../services/api.js');
      
      // Add a timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Token validation timeout')), 5000)
      );
      
      const result = await Promise.race([
        ApiService.validateToken(),
        timeoutPromise
      ]);

      if (!result.success) {
        this.clearAuthData();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Token validation error:', error);
      this.clearAuthData();
      return false;
    }
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
