import React, { createContext, useContext, useState, useEffect } from "react";
import { authUtils } from "../utils/auth.js";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);

      try {
        // Check if user has a valid token
        if (authUtils.isAuthenticated()) {
          // Validate token with server
          const isValid = await authUtils.validateTokenWithServer();

          if (isValid) {
            setIsAuthenticated(true);
            setUser(authUtils.getUserData());
          } else {
            // Token is invalid, clear auth data
            setIsAuthenticated(false);
            setUser(null);
            authUtils.clearAuthData();
          }
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        setIsAuthenticated(false);
        setUser(null);
        authUtils.clearAuthData();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Set up periodic token validation
  useEffect(() => {
    if (!isAuthenticated) return;

    // Check token validity every 10 minutes
    const interval = setInterval(async () => {
      try {
        const isValid = await authUtils.validateTokenWithServer();
        if (!isValid) {
          logout();
        }
      } catch (error) {
        console.error("Periodic token validation error:", error);
        logout();
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Login function
  const login = (token, userData) => {
    authUtils.setAuthData(token, userData);
    setIsAuthenticated(true);
    setUser(userData);
  };

  // Logout function
  const logout = () => {
    authUtils.clearAuthData();
    setIsAuthenticated(false);
    setUser(null);
  };

  // Refresh user authentication state
  const refreshAuth = async () => {
    if (authUtils.isAuthenticated()) {
      const isValid = await authUtils.validateTokenWithServer();
      if (!isValid) {
        logout();
      }
    }
  };

  // Update user data
  const updateUser = (userData) => {
    setUser((prevUser) => ({ ...prevUser, ...userData }));
    // Optionally update stored user data
    const token = authUtils.getToken();
    if (token) {
      authUtils.setAuthData(token, { ...user, ...userData });
    }
  };

  const value = {
    isAuthenticated,
    isLoading,
    user,
    login,
    logout,
    refreshAuth,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
