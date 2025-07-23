import React from "react";
import { useNavigate, NavLink } from "react-router-dom";
import "./Navbar.css";

export default function Navbar({ navItems = ["Home", "CatCorner", "Wholesome", "Marketplace"] }) {
  const navigate = useNavigate();

  const getPath = (label) => {
    switch (label) {
      case "Home": return "/home";
      case "CatCorner": return "/catcorner";
      default: return `/${label.toLowerCase()}`;
    }
  };

  return (
    <header className="navbar glass-bg shadow-lg border-b border-green-300 animate-fade-in-down">
      <div className="navbar-inner flex items-center justify-between w-full max-w-7xl mx-auto px-6">
        
        {/* Logo + Search */}
        <div className="flex items-center gap-4 w-1/3 min-w-[220px]">
          <img
            src="/catlogo.svg"
            alt="IUTVerse Logo"
            className="h-12 w-12 rounded-full shadow-lg border-2 border-green-400 hover:scale-105 transition-transform"
          />
          <input
            type="text"
            placeholder="Search IUTVerse..."
            className="search-input"
          />
        </div>

        {/* Middle Navigation */}
        <nav className="flex gap-8 w-1/3 justify-center items-center">
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
        <div className="flex items-center gap-4 justify-end w-1/3">
          <img
            src="/profile.jpg"
            alt="User"
            className="h-11 w-11 rounded-full border-2 border-green-500 shadow hover:scale-105 transition"
          />
          <button
            className="logout-btn"
            onClick={() => navigate("/login")}
          >
            Logout
          </button>
        </div>

      </div>
    </header>
  );
}
