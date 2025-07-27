import React from "react";
import "./RandomConfessionModal.css";

export default function RandomConfessionModal({ confession, onClose, onShowAnother }) {
  if (!confession) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="random-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">🎲 Random Confession</h2>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
          <div className="modal-content">
            <div className="no-confession">
              <div className="no-confession-icon">🤐</div>
              <h3>No confessions available</h3>
              <p>Be the first to confess something!</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

  const tagColor = getTagColor(confession.tag);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="random-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">🎲 Random Confession</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-content">
          <div className="random-confession-card">
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

            {/* Poll Section */}
            {confession.poll && (
              <div className="poll-section">
                <h4 className="poll-question">{confession.poll.question}</h4>
                <div className="poll-options">
                  {confession.poll.options.map((option, index) => (
                    <div key={index} className="poll-option">
                      <div className="poll-option-content">
                        <span className="poll-option-text">{option.text}</span>
                        <span className="poll-percentage">{option.percentage}%</span>
                      </div>
                      <div 
                        className="poll-progress-bar"
                        style={{ width: `${option.percentage}%` }}
                      ></div>
                    </div>
                  ))}
                </div>
                <div className="poll-total">
                  {confession.poll.totalVotes} votes
                </div>
              </div>
            )}

            {/* Reactions Summary */}
            <div className="reactions-summary">
              <div className="reactions-grid">
                <span className="reaction-item">
                  <span className="reaction-icon">❤️</span>
                  <span className="reaction-count">{confession.reactions.like}</span>
                </span>
                <span className="reaction-item">
                  <span className="reaction-icon">😂</span>
                  <span className="reaction-count">{confession.reactions.funny}</span>
                </span>
                <span className="reaction-item">
                  <span className="reaction-icon">😭</span>
                  <span className="reaction-count">{confession.reactions.relatable}</span>
                </span>
                <span className="reaction-item">
                  <span className="reaction-icon">😠</span>
                  <span className="reaction-count">{confession.reactions.angry}</span>
                </span>
                <span className="reaction-item">
                  <span className="reaction-icon">🧠</span>
                  <span className="reaction-count">{confession.reactions.insightful}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="show-another-btn" onClick={onShowAnother}>
            🎲 Show Another
          </button>
          <button className="close-modal-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
} 