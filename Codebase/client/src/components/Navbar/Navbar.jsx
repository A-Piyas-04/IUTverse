import React from "react";
import { useNavigate, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext.jsx";
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
  const { logout } = useAuth();
  const isOnChatPage = location.pathname === "/chat";

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
      default:
        return `/${label.toLowerCase()}`;
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="navbar glass-bg shadow-lg border-b border-green-300 animate-fade-in-down">
      <div className="navbar-inner grid grid-cols-3 items-center w-full   px-6">
        {/* Left: Logo + Search */}
        <div className="flex items-center gap-4 justify-start">
          <img
            src="/iut_logo.png"
            alt="IUTVerse Logo"
            className="h-[50px] w-[40px] shadow-lg hover:scale-105 transition-transform cursor-pointer"
            onClick={() => navigate("/")}
          />
          <input
            type="text"
            placeholder="Search IUTVerse..."
            className="search-input w-[50px] ml-2 mr-35"
          />
        </div>

        {/* Middle: Navigation */}
        <nav className="flex gap-8 justify-center items-center">
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
            src="/profile_picture.jpg"
            alt="User"
            className="h-[45px] w-[45px] rounded-full shadow hover:scale-105 transition cursor-pointer"
            onClick={() => navigate("/profile")}
          />
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
