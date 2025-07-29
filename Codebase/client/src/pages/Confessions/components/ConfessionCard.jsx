import React, { useState } from "react";
import "./ConfessionCard.css";

export default function ConfessionCard({
  confession,
  onReaction,
  onPollVote,
  disabled = false,
}) {
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState(null);

  const formatTimeAgo = (timestamp) => {
    const now = new Date(timestamp);
    const diff = Date.now() - now.getTime();
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
      Wholesome: { bg: "#dcfce7", text: "#166534", border: "#22c55e" },
      Funny: { bg: "#fce7f3", text: "#be185d", border: "#ec4899" },
      "Relationship Drama": {
        bg: "#fef2f2",
        text: "#991b1b",
        border: "#ef4444",
      },
      "Food Adventures": { bg: "#fef3c7", text: "#92400e", border: "#f59e0b" },
      "Study Struggles": { bg: "#e0e7ff", text: "#3730a3", border: "#6366f1" },
      "Campus Life": { bg: "#f0fdf4", text: "#166534", border: "#22c55e" },
      "Personal Growth": { bg: "#fdf2f8", text: "#9d174d", border: "#ec4899" },
      "Random Thoughts": { bg: "#f3f4f6", text: "#374151", border: "#9ca3af" },
    };
    return colors[tag] || colors["Random Thoughts"];
  };

  const handlePollVote = (optionIndex) => {
    if (!hasVoted && !disabled) {
      setHasVoted(true);
      setUserVote(optionIndex);
      onPollVote(confession.id, optionIndex);
    }
  };

  const tagColor = getTagColor(confession.tag);

  return (
    <div className="confession-card">
      {/* Card Header */}
      <div className="card-header">
        <div className="anonymous-label">
          <span className="anonymous-icon">👤</span>
          Anonymous Confessor
        </div>
        <div className="card-meta">
          <span className="timestamp">
            {formatTimeAgo(confession.timestamp)}
          </span>
        </div>
      </div>

      {/* Tag */}
      <div className="tag-container">
        <span
          className="tag-pill"
          style={{
            backgroundColor: tagColor.bg,
            color: tagColor.text,
            borderColor: tagColor.border,
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
              <div
                key={index}
                className={`poll-option ${hasVoted ? "voted" : ""} ${
                  userVote === index ? "user-vote" : ""
                } ${disabled ? "disabled" : ""}`}
                onClick={() => handlePollVote(index)}
                style={{ cursor: disabled ? "not-allowed" : "pointer" }}
              >
                <div className="poll-option-content">
                  <span className="poll-option-text">{option.text}</span>
                  {hasVoted && (
                    <span className="poll-percentage">
                      {option.percentage}%
                    </span>
                  )}
                </div>
                {hasVoted && (
                  <div
                    className="poll-progress-bar"
                    style={{ width: `${option.percentage}%` }}
                  ></div>
                )}
                {!hasVoted && <div className="poll-vote-indicator">Vote</div>}
              </div>
            ))}
          </div>
          {hasVoted && (
            <div className="poll-total">{confession.poll.totalVotes} votes</div>
          )}
        </div>
      )}

      {/* Reactions */}
      <div className="reactions-section">
        <div className="reactions-grid">
          <button
            className="reaction-btn"
            onClick={() => onReaction(confession.id, "like")}
            disabled={disabled}
          >
            <span className="reaction-icon">❤️</span>
            <span className="reaction-count">{confession.reactions.like}</span>
          </button>

          <button
            className="reaction-btn"
            onClick={() => onReaction(confession.id, "funny")}
            disabled={disabled}
          >
            <span className="reaction-icon">😂</span>
            <span className="reaction-count">{confession.reactions.funny}</span>
          </button>

          <button
            className="reaction-btn"
            onClick={() => onReaction(confession.id, "relatable")}
            disabled={disabled}
          >
            <span className="reaction-icon">😭</span>
            <span className="reaction-count">
              {confession.reactions.relatable}
            </span>
          </button>

          <button
            className="reaction-btn"
            onClick={() => onReaction(confession.id, "angry")}
            disabled={disabled}
          >
            <span className="reaction-icon">😠</span>
            <span className="reaction-count">{confession.reactions.angry}</span>
          </button>

          <button
            className="reaction-btn"
            onClick={() => onReaction(confession.id, "insightful")}
            disabled={disabled}
          >
            <span className="reaction-icon">🧠</span>
            <span className="reaction-count">
              {confession.reactions.insightful}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
