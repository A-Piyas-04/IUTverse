import React from "react";
import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white/90 backdrop-blur-lg shadow-2xl w-full border-b border-green-200 animate-fade-in-down">
      {/* Logo + Search */}
      <div className="flex items-center gap-4 w-1/3 min-w-[200px]">
        <img
          src="https://scholarship.oic-oci.org/media/universities/logos/iut_logo.png"
          alt="Logo"
          className="h-[40px] w-[40px] rounded-full shadow-lg mr-[12px] hover:scale-105 transition-transform duration-200"
        />
        <input
          type="text"
          placeholder="Search IUTVerse..."
          className="w-100 px-4 py-2 rounded-full bg-gray-100 text-sm text-gray-800 placeholder-gray-400 border border-green-200 focus:outline-none focus:ring-2 focus:ring-green-400 transition shadow-inner hover:shadow-green-200/30"
        />
      </div>

      {/* Middle nav */}
      <nav className="flex gap-8 w-1/3 justify-between text-base font-medium text-green-700">
        {["Home", "CatCorner", "Wholesome", "Marketplace"].map((label, i) => (
          <a
            key={i}
            href={`/${
              label.toLowerCase() === "home" ? "" : label.toLowerCase()
            }`}
            className="relative px-3 py-1 rounded-lg transition-all duration-200 hover:bg-green-100 hover:text-green-900 focus:outline-none focus:ring-2 focus:ring-green-400 shadow-sm group"
          >
            <span className="group-hover:scale-105 group-hover:font-bold transition-transform duration-200">
              {label}
            </span>
            <span className="absolute left-1/2 -bottom-1 w-0 h-0.5 bg-green-400 rounded-full group-hover:w-3/4 transition-all duration-300 group-hover:h-1"></span>
          </a>
        ))}
      </nav>

      {/* Right: Profile */}
      <div className="flex items-center gap-4 w-1/3 justify-end min-w-[200px]">
        <img
          src="https://www.wondercide.com/cdn/shop/articles/Upside_down_gray_cat.png?v=1685551065&width=1500"
          alt="Profile"
          className="h-[30px] w-[30px] mr-[12px] rounded-full shadow border-2 border-green-500 hover:scale-105 transition-transform duration-200"
          onClick={() => navigate("/profile")}
        />
        <button
          className="text-sm px-4 py-1.5 rounded-[10px] bg-gradient-to-r from-green-500 to-green-400 hover:from-green-400 hover:to-green-300 hover:scale-105 active:scale-95 transition-all duration-200 text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-green-400"
          onClick={() => navigate("/login")}
        >
          Logout
        </button>
      </div>
    </header>
  );
}
