import React from "react";
import { useNavigate, NavLink } from "react-router-dom";
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
  const { logout } = useAuth();

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

        {/* Right: Profile + Logout */}
        <div className="flex items-center gap-4 justify-end">
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
