import React, { useState, useEffect, useRef } from "react";
import { useNavigate, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext.jsx";
import ApiService from "../../services/api.js";
import "./Navbar.css";

export default function Navbar({
  navItems = [
    "Home",
    "CatCorner",
    "LostAndFound",
    "Jobs",
    "EventHub",
    "Confessions",
  ],
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const isOnChatPage = location.pathname === "/chat";

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const searchResultsRef = useRef(null);
  
  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const getPath = (label) => {
    switch (label) {
      case "Home":
        return "/";
      case "CatCorner":
        return "/catcorner";
      case "LostAndFound":
        return "/lostandfound";
      case "Confessions":
        return "/confessions";
      case "Jobs":
        return "/jobs";
      case "EventHub":
        return "/eventhub";
      case "Academic":
        return "/academic";
      default:
        return `/${label.toLowerCase()}`;
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Get user profile picture URL
  const getProfilePictureUrl = (userId = null) => {
    const targetUserId = userId || (user && user.id);
    if (!targetUserId) {
      return "/profile_picture.jpg"; // Default image
    }
    return ApiService.getProfilePictureUrl(targetUserId);
  };

  // Search for users
  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    // Don't search for very short queries
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const trimmedQuery = query.trim();

    try {
      setIsSearching(true);
      setSearchError(null);

      // Use the dedicated search method from ApiService
      const response = await ApiService.searchUsers(trimmedQuery);

      // Handle the response structure correctly
      // The API returns: { success: true, data: { success: true, data: Array } }
      const userData = response.data?.data || response.data || [];
      setSearchResults(userData);
    } catch (err) {
      console.error("Error searching users:", err);
      setSearchError("Failed to search users");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle user profile navigation
  const handleUserClick = (userId) => {
    setShowSearchResults(false);
    setSearchQuery("");
    navigate(`/profile/${userId}`);
  };

  // Get user initials for the avatar
  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchResultsRef.current &&
        !searchResultsRef.current.contains(event.target)
      ) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        searchUsers(searchQuery);
        setShowSearchResults(true);
      } else {
        setShowSearchResults(false);
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [searchQuery]);

  return (
    <header className="navbar glass-bg shadow-lg border-b border-green-300 animate-fade-in-down">
      <div className="navbar-inner flex items-center justify-between w-full px-6">
        {/* Mobile Menu Toggle Button */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-green-100 transition-colors duration-200"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <svg 
            className={`w-6 h-6 text-green-700 transition-transform duration-300 ${isMobileMenuOpen ? 'rotate-90' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
        
        {/* Left: Logo + Search */}
        <div className="flex items-center gap-4 justify-start relative">
          <img
            src="/iut_logo.png"
            alt="IUTVerse Logo"
            className="h-[50px] w-[40px] shadow-lg hover:scale-105 transition-transform cursor-pointer"
            onClick={() => navigate("/")}
          />
          {/* Search - Hidden on mobile */}
          <div className="relative hidden md:block">
            <input
              type="text"
              placeholder="Search users..."
              className="search-input w-[200px] ml-2"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchQuery.trim().length >= 2) {
                  setShowSearchResults(true);
                }
              }}
            />
            <div className="absolute inset-y-0 right-2 flex items-center">
              {isSearching ? (
                <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span className="text-gray-400">🔍</span>
              )}
            </div>

            {/* Search Results Dropdown */}
            {showSearchResults && (
              <div
                ref={searchResultsRef}
                className="absolute top-full left-0 mt-1 w-72 max-h-80 overflow-y-auto bg-white rounded-xl shadow-lg border border-green-200 z-50"
                style={{ animation: "slideInDown 0.2s ease-out forwards" }}
              >
                {searchError && (
                  <div className="p-3 text-center text-red-500 border-b border-gray-100">
                    {searchError}
                  </div>
                )}

                {searchResults.length > 0 ? (
                  <div className="py-2">
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => handleUserClick(user.id)}
                        className="flex items-center space-x-3 p-3 hover:bg-green-50 cursor-pointer transition-all"
                      >
                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center text-white font-semibold overflow-hidden">
                          {user.profilePicture ? (
                            <img
                              src={getProfilePictureUrl(user.id)}
                              alt={user.name}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.innerHTML = getInitials(user.name);
                              }}
                            />
                          ) : (
                            getInitials(user.name)
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">
                            {user.name}
                          </p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : searchQuery.trim().length >= 2 ? (
                  <div className="p-4 text-center text-gray-500">
                    No users found
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    Type at least 2 characters to search
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Middle: Navigation - Hidden on mobile */}
        <nav className="hidden md:flex gap-8 justify-center items-center">
          {navItems.map((label, i) => (
            <NavLink
              key={i}
              to={getPath(label)}
              className={({ isActive }) =>
                `nav-btn ${isActive ? "active" : ""}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        
        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <>
            <div 
              className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="md:hidden fixed top-20 left-0 right-0 bg-white bg-opacity-98 backdrop-blur-lg z-50 border-b border-green-300 animate-fade-in-down">
              <div className="h-full overflow-y-auto">
                <nav className="flex flex-col p-8 space-y-2">
                  {/* Navigation Header */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Navigation</h3>
                    <div className="w-12 h-1 bg-gradient-to-r from-green-500 to-blue-500 rounded-full"></div>
                  </div>

                  {navItems.map((label, i) => (
                    <NavLink
                      key={i}
                      to={getPath(label)}
                      className={({ isActive }) =>
                        `mobile-nav-btn-enhanced ${isActive ? "active" : ""}`
                      }
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                          {label === 'Home' ? '🏠' : label === 'EventHub' ? '📅' : label === 'LostAndFound' ? '🔍' : label === 'CatCorner' ? '🐱' : label === 'Jobs' ? '💼' : label === 'Confessions' ? '💭' : '📄'}
                        </div>
                        <span>{label}</span>
                      </div>
                    </NavLink>
                  ))}
                  
                  {/* Mobile Search Section */}
                  <div className="mt-8 pt-6 border-t border-gray-200 relative">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Search</h3>
                      <div className="w-12 h-1 bg-gradient-to-r from-green-500 to-blue-500 rounded-full"></div>
                    </div>
                    
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search users..."
                        className="mobile-search-input w-full"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => {
                          if (searchQuery.trim().length >= 2) {
                            setShowSearchResults(true);
                          }
                        }}
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* Mobile Search Results */}
                    {showSearchResults && (
                      <div
                        ref={searchResultsRef}
                        className="absolute top-full left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-white rounded-2xl shadow-xl border border-gray-200 z-50"
                        style={{ 
                          animation: "slideInDown 0.3s ease-out forwards",
                          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)'
                        }}
                      >
                        {searchError && (
                          <div className="p-4 text-center text-red-500 border-b border-gray-100">
                            {searchError}
                          </div>
                        )}

                        {searchResults.length > 0 ? (
                          <div className="py-2">
                            {searchResults.map((user) => (
                              <div
                                key={user.id}
                                onClick={() => {
                                  handleUserClick(user.id);
                                  setIsMobileMenuOpen(false);
                                }}
                                className="flex items-center space-x-4 p-4 hover:bg-gray-50 cursor-pointer transition-all duration-200 border-b border-gray-50 last:border-b-0"
                              >
                                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center text-white font-semibold overflow-hidden">
                                  {user.profilePicture ? (
                                    <img
                                      src={getProfilePictureUrl(user.id)}
                                      alt={user.name}
                                      className="h-full w-full object-cover"
                                      onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.innerHTML = getInitials(user.name);
                                      }}
                                    />
                                  ) : (
                                    getInitials(user.name)
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-gray-800">
                                    {user.name}
                                  </p>
                                  <p className="text-sm text-gray-500">{user.email}</p>
                                </div>
                                <div className="text-gray-400">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : searchQuery.trim().length >= 2 ? (
                          <div className="p-6 text-center text-gray-500">
                            <div className="mb-2">🔍</div>
                            <p>No users found</p>
                          </div>
                        ) : (
                          <div className="p-6 text-center text-gray-500">
                            <div className="mb-2">💭</div>
                            <p>Type at least 2 characters to search</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </nav>
              </div>
            </div>
          </>
        )}

        {/* Right: Chat + Profile + Logout */}
        <div className="flex items-center gap-4 justify-end">
          <div
            className={`h-[45px] w-[45px] rounded-full shadow hover:scale-105 transition cursor-pointer flex items-center justify-center ${
              isOnChatPage
                ? "bg-green-600 text-white"
                : "bg-green-100 text-green-600"
            }`}
            onClick={() => navigate("/chat")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
              />
            </svg>
          </div>
          <img
            src={getProfilePictureUrl()}
            alt="User"
            className="h-[45px] w-[45px] rounded-full shadow hover:scale-105 transition cursor-pointer"
            onClick={() => navigate("/profile")}
            onError={(e) => {
              // Fallback to default image if the profile picture fails to load
              e.target.onerror = null;
              e.target.src = "/profile_picture.jpg";
            }}
          />
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
