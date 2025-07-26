import React from "react";
import { useNavigate, NavLink } from "react-router-dom";
import "./Navbar.css";

export default function Navbar({
  navItems = [
    "Home",
    "CatCorner",
    "LostAndFound",
    "Jobs",
    "Wholesome",
    "Marketplace",
  ],
}) {
  const navigate = useNavigate();

  const getPath = (label) => {
    switch (label) {
      case "Home":
        return "/home";
      case "CatCorner":
        return "/catcorner";
      case "LostAndFound":
        return "/lostandfound";
      case "Jobs":
        return "/jobs";
      default:
        return `/${label.toLowerCase()}`;
    }
  };

  return (
    <header className="navbar glass-bg shadow-lg border-b border-green-300 animate-fade-in-down">
      <div className="navbar-inner flex items-center justify-between w-full max-w-7xl mx-auto px-6">
        {/* Left: Logo + Search */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <img
            src="../../../public/iut_logo.png"
            alt="IUTVerse Logo"
            className="h-[50px] w-[40px] shadow-lg hover:scale-105 transition-transform cursor-pointer"
            onClick={() => navigate("/home")}
          />
          <input
            type="text"
            placeholder="Search IUTVerse..."
            className="search-input w-[200px]"
          />
        </div>

        {/* Middle: Navigation */}
        <nav className="flex gap-8 justify-center items-center flex-grow">
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
        <div className="flex items-center gap-4 flex-shrink-0">
          <img
            src="../../../public/profile_picture.jpg"
            alt="User"
            className="h-[45px] w-[45px] rounded-full shadow hover:scale-105 transition cursor-pointer"
            onClick={() => navigate("/profile")}
          />
          <button className="logout-btn" onClick={() => navigate("/login")}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
