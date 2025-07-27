import React from "react";
import "./Sidebar.css";

const navigationOptions = [
  { label: "Posts", emoji: "🐈" },
  { label: "Cat Profiles", emoji: "🐾" },
  { label: "Release your Stress", emoji: "😺" },
  { label: "Random Cat Facts", emoji: "📚" },
  // { label: "Cat Game", emoji: "🎮" },
  { label: "Cat Help Desk", emoji: "🆘" },
];

export default function Sidebar({ selectedView, setSelectedView }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-title">
          <span role="img" aria-label="cat">🐱</span> CatCorner
        </h2>
        <hr className="sidebar-divider" />
      </div>

      <ul className="sidebar-menu">
        {navigationOptions.map(({ label, emoji }) => (
          <li key={label}>
            <button
              onClick={() => setSelectedView(label)}
              className={`sidebar-button ${selectedView === label ? "active" : ""}`}
            >
              <span className="sidebar-emoji">{emoji}</span>
              <span className="sidebar-label">{label}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="sidebar-footer">
        <hr className="sidebar-footer-divider" />
        <div className="sidebar-note">
          <span role="img" aria-label="paw">🐾</span> Enjoy your time with campus cats!
        </div>
      </div>
    </aside>
  );
}
