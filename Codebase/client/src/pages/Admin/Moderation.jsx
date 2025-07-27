import React, { useState } from "react";
import Navbar from "../../components/Navbar/Navbar.jsx";
import "./Moderation.css";

// Sample pending confessions - in a real app, this would come from a database
const SAMPLE_PENDING_CONFESSIONS = [
  {
    id: 101,
    content: "I accidentally sent a text meant for my friend to my professor. It said 'I can't believe how boring this class is' and now I'm terrified. 😰",
    tag: "Academic Stress",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    status: "pending"
  },
  {
    id: 102,
    content: "My roommate has been eating my food from the fridge for weeks. I finally caught them red-handed and they denied it. Should I confront them?",
    tag: "Hall Life",
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    status: "pending"
  },
  {
    id: 103,
    content: "I found a stray cat near the library and secretly feed it every day. I've named it Professor Whiskers and it's become my unofficial therapy session.",
    tag: "Wholesome",
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    status: "pending"
  }
];

export default function Moderation() {
  const [pendingConfessions, setPendingConfessions] = useState(SAMPLE_PENDING_CONFESSIONS);
  const [filter, setFilter] = useState("all");

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      return `${days}d ago`;
    }
  };

  const getTagColor = (tag) => {
    const colors = {
      "Academic Stress": { bg: "#fef3c7", text: "#92400e", border: "#fbbf24" },
      "Hall Life": { bg: "#dbeafe", text: "#1e40af", border: "#3b82f6" },
      "Wholesome": { bg: "#dcfce7", text: "#166534", border: "#22c55e" },
      "Funny": { bg: "#fce7f3", text: "#be185d", border: "#ec4899" },
      "Relationship Drama": { bg: "#fef2f2", text: "#991b1b", border: "#ef4444" },
      "Food Adventures": { bg: "#fef3c7", text: "#92400e", border: "#f59e0b" },
      "Study Struggles": { bg: "#e0e7ff", text: "#3730a3", border: "#6366f1" },
      "Campus Life": { bg: "#f0fdf4", text: "#166534", border: "#22c55e" },
      "Personal Growth": { bg: "#fdf2f8", text: "#9d174d", border: "#ec4899" },
      "Random Thoughts": { bg: "#f3f4f6", text: "#374151", border: "#9ca3af" }
    };
    return colors[tag] || colors["Random Thoughts"];
  };

  const handleApprove = (confessionId) => {
    setPendingConfessions(prev => 
      prev.filter(confession => confession.id !== confessionId)
    );
    // In a real app, this would update the database
    console.log(`Approved confession ${confessionId}`);
  };

  const handleReject = (confessionId) => {
    setPendingConfessions(prev => 
      prev.filter(confession => confession.id !== confessionId)
    );
    // In a real app, this would update the database
    console.log(`Rejected confession ${confessionId}`);
  };

  const filteredConfessions = pendingConfessions.filter(confession => 
    filter === "all" || confession.tag === filter
  );

  const uniqueTags = [...new Set(pendingConfessions.map(c => c.tag))];

  return (
    <div className="moderation-page">
      <Navbar />
      
      <div className="moderation-main">
        {/* Header Section */}
        <div className="moderation-header">
          <div className="header-content">
            <h1 className="main-title">
              <span className="icon">🛡️</span>
              Moderation Panel
            </h1>
            <p className="subtitle">
              Review and approve pending confessions
            </p>
          </div>
        </div>

        {/* Controls Section */}
        <div className="controls-section">
          <div className="controls-left">
            <div className="filter-container">
              <label className="filter-label">Filter by:</label>
              <select 
                value={filter} 
                onChange={(e) => setFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Categories</option>
                {uniqueTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="controls-right">
            <div className="stats">
              <span className="stat-item">
                <span className="stat-label">Pending:</span>
                <span className="stat-value">{filteredConfessions.length}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Pending Confessions */}
        <div className="pending-confessions">
          {filteredConfessions.length > 0 ? (
            <div className="confessions-grid">
              {filteredConfessions.map(confession => {
                const tagColor = getTagColor(confession.tag);
                
                return (
                  <div key={confession.id} className="pending-confession-card">
                    {/* Card Header */}
                    <div className="card-header">
                      <div className="anonymous-label">
                        <span className="anonymous-icon">👤</span>
                        Anonymous Confessor
                      </div>
                      <div className="card-meta">
                        <span className="timestamp">{formatTimeAgo(confession.timestamp)}</span>
                      </div>
                    </div>

                    {/* Tag */}
                    <div className="tag-container">
                      <span 
                        className="tag-pill"
                        style={{
                          backgroundColor: tagColor.bg,
                          color: tagColor.text,
                          borderColor: tagColor.border
                        }}
                      >
                        {confession.tag}
                      </span>
                    </div>

                    {/* Confession Content */}
                    <div className="confession-content">
                      <p className="confession-text">{confession.content}</p>
                    </div>

                    {/* Moderation Actions */}
                    <div className="moderation-actions">
                      <button 
                        className="approve-btn"
                        onClick={() => handleApprove(confession.id)}
                      >
                        ✅ Approve
                      </button>
                      <button 
                        className="reject-btn"
                        onClick={() => handleReject(confession.id)}
                      >
                        ❌ Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-pending">
              <div className="no-pending-icon">✅</div>
              <h3>No pending confessions</h3>
              <p>All confessions have been reviewed!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 