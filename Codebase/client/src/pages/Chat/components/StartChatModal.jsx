import React, { useState, useEffect } from "react";
import ApiService from "../../../services/api.js";

const StartChatModal = ({ onStartChat, onClose }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Search for users
  const searchUsers = async (query) => {
    console.log("🔍 [StartChatModal] searchUsers called with query:", query);

    if (!query.trim()) {
      console.log("🔍 [StartChatModal] Empty query, clearing users");
      setUsers([]);
      return;
    }

    // Don't search for very short queries
    if (query.trim().length < 2) {
      console.log(
        "🔍 [StartChatModal] Query too short (<2 chars), clearing users"
      );
      setUsers([]);
      return;
    }

    const trimmedQuery = query.trim();
    console.log(
      "🔍 [StartChatModal] Searching with trimmed query:",
      trimmedQuery
    );

    try {
      setLoading(true);
      setError(null);
      console.log(
        "🔍 [StartChatModal] Setting loading to true, calling ApiService.searchUsers"
      );

      // Use the dedicated search method from ApiService
      const response = await ApiService.searchUsers(trimmedQuery);

      console.log("🔍 [StartChatModal] Raw response from API:", response);
      console.log("🔍 [StartChatModal] Response.data:", response.data);
      console.log("🔍 [StartChatModal] Response structure:", {
        hasData: !!response.data,
        dataType: typeof response.data,
        dataLength: Array.isArray(response.data)
          ? response.data.length
          : "not array",
        fullResponse: response,
      });

      // Handle the response structure correctly
      // The API returns: { success: true, data: { success: true, data: Array } }
      // So we need to access response.data.data for the actual user array
      const userData = response.data?.data || response.data || [];
      console.log("🔍 [StartChatModal] Extracted user data:", userData);
      console.log(
        "🔍 [StartChatModal] Is userData an array?",
        Array.isArray(userData)
      );

      setUsers(userData);
    } catch (err) {
      console.error("❌ [StartChatModal] Error searching users:", err);
      console.error("❌ [StartChatModal] Error details:", {
        message: err.message,
        stack: err.stack,
        response: err.response?.data,
        status: err.response?.status,
      });
      setError("Failed to search users. Please try again.");
      setUsers([]);
    } finally {
      console.log("🔍 [StartChatModal] Setting loading to false");
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    console.log(
      "⏱️ [StartChatModal] Search debounce triggered, searchQuery:",
      searchQuery
    );

    const timeoutId = setTimeout(() => {
      console.log(
        "⏱️ [StartChatModal] Debounce timeout executed, calling searchUsers with:",
        searchQuery
      );
      searchUsers(searchQuery);
    }, 300);

    return () => {
      console.log("⏱️ [StartChatModal] Clearing debounce timeout");
      clearTimeout(timeoutId);
    };
  }, [searchQuery]);

  const handleStartChat = (userId) => {
    if (!userId) {
      setError("Invalid user selected");
      return;
    }
    onStartChat(userId);
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm modal-overlay">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 transform transition-all duration-300 modal-content">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-green-600 to-green-700 rounded-t-2xl">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-2xl">✨</span>
            Start New Chat
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-2xl font-semibold transition-colors duration-200 hover:bg-white hover:bg-opacity-20 rounded-full p-2"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* Search Input */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Search for users
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  const newValue = e.target.value;
                  console.log("📝 [StartChatModal] Search input changed:", {
                    oldValue: searchQuery,
                    newValue: newValue,
                    length: newValue.length,
                  });
                  setSearchQuery(newValue);
                }}
                placeholder="Enter name or email..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all duration-300 bg-gray-50 focus:bg-white"
                autoFocus
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="text-gray-400 text-xl">🔍</span>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl">
              <p className="text-red-700 text-sm font-medium flex items-center gap-2">
                <span className="text-red-500">⚠️</span>
                {error}
              </p>
            </div>
          )}

          {/* Search Results */}
          <div className="max-h-64 overflow-y-auto rounded-xl">
            {loading ? (
              <div className="text-center py-8">
                <div className="loading-spinner w-8 h-8 border-3 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-3"></div>
                <div className="text-gray-500 font-medium">
                  Searching users...
                </div>
              </div>
            ) : users.length > 0 ? (
              <div className="space-y-2">
                {users.map((user, index) => (
                  <div
                    key={user.id}
                    onClick={() => handleStartChat(user.id)}
                    className="flex items-center space-x-4 p-4 rounded-xl hover:bg-gradient-to-r hover:from-green-50 hover:to-blue-50 cursor-pointer transition-all duration-300 border border-transparent hover:border-green-200 user-item group"
                    style={{
                      animationDelay: `${index * 0.1}s`,
                      animation: "slideInLeft 0.4s ease-out forwards",
                    }}
                  >
                    <div className="conversation-avatar">
                      <div className="avatar-gradient">
                        {getInitials(user.name)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 truncate">
                        {user.name || "Unknown User"}
                      </h4>
                      <p className="text-xs text-gray-500 truncate">
                        {user.email}
                      </p>
                      {user.department && (
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          <span>🎓</span>
                          {user.department}{" "}
                          {user.batch && `• Batch ${user.batch}`}
                        </p>
                      )}
                    </div>
                    <div className="text-green-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center">
                      <span className="text-lg">💬</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : searchQuery.trim().length > 0 &&
              searchQuery.trim().length < 2 ? (
              <div className="text-center py-8 search-hint">
                <div className="text-3xl mb-3">⌨️</div>
                <h3 className="font-semibold text-gray-700 mb-1">
                  Keep typing...
                </h3>
                <p className="text-sm text-gray-500">
                  Enter at least 2 characters to search
                </p>
              </div>
            ) : searchQuery.trim() ? (
              <div className="text-center py-8 empty-search">
                <div className="text-4xl mb-3 animate-pulse">🔍</div>
                <h3 className="font-semibold text-gray-700 mb-1">
                  No users found
                </h3>
                <p className="text-sm text-gray-500">
                  Try searching with a different name or email
                </p>
              </div>
            ) : (
              <div className="text-center py-8 search-placeholder">
                <div className="text-4xl mb-3 animate-bounce">👥</div>
                <h3 className="font-semibold text-gray-700 mb-1">
                  Find your friends
                </h3>
                <p className="text-sm text-gray-500">
                  Start typing to search for users by name or email
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-gray-200 to-gray-300 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:from-gray-300 hover:to-gray-400 transition-all duration-300 transform hover:-translate-y-0.5"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default StartChatModal;
