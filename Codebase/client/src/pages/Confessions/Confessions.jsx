import React, { useState } from "react";
import Navbar from "../../components/Navbar/Navbar.jsx";
import ConfessionCard from "./components/ConfessionCard.jsx";
import ConfessionModal from "./components/ConfessionModal.jsx";
import AnalyticsWidget from "./components/AnalyticsWidget.jsx";
import RandomConfessionModal from "./components/RandomConfessionModal.jsx";
import LoadingSpinner from "../../components/LoadingSpinner/LoadingSpinner.jsx";
import ErrorBoundary from "../../components/ErrorBoundary/ErrorBoundary.jsx";
import { useConfessions } from "../../hooks/useConfessions.js";
import "./Confessions.css";

const TAGS = [
  "Academic Stress",
  "Hall Life",
  "Wholesome",
  "Funny",
  "Relationship Drama",
  "Food Adventures",
  "Study Struggles",
  "Campus Life",
  "Personal Growth",
  "Random Thoughts",
];

export default function Confessions() {
  const {
    confessions,
    loading,
    error,
    analytics,
    filter,
    sortBy,
    hasMore,
    isLoggedIn,
    setFilter,
    setSortBy,
    submitConfession,
    handleReaction,
    handlePollVote,
    getRandomConfession,
    loadMore,
    refresh,
    hasConfessions,
  } = useConfessions();

  const [showConfessionModal, setShowConfessionModal] = useState(false);
  const [showRandomModal, setShowRandomModal] = useState(false);
  const [randomConfession, setRandomConfession] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [reactionError, setReactionError] = useState(null);

  // Handle new confession submission
  const handleSubmitConfession = async (confessionData) => {
    try {
      setSubmitting(true);
      await submitConfession(confessionData);
      setShowConfessionModal(false);
    } catch (err) {
      console.error("Failed to submit confession:", err);
      alert("Failed to submit confession. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle reaction with error handling
  const handleReactionWithError = async (confessionId, reactionType) => {
    try {
      setReactionError(null);
      await handleReaction(confessionId, reactionType);
    } catch (err) {
      setReactionError(err.message);
      setTimeout(() => setReactionError(null), 3000);
    }
  };

  // Handle poll voting with error handling
  const handlePollVoteWithError = async (confessionId, optionIndex) => {
    try {
      setReactionError(null);
      const confession = confessions.find((c) => c.id === confessionId);
      if (
        confession &&
        confession.poll &&
        confession.poll.options[optionIndex]
      ) {
        const optionId = confession.poll.options[optionIndex].id;
        const pollId = confession.poll.id;
        await handlePollVote(confessionId, pollId, optionId);
      }
    } catch (err) {
      setReactionError(err.message);
      setTimeout(() => setReactionError(null), 3000);
    }
  };

  // Get random confession
  const handleGetRandomConfession = async () => {
    try {
      const confession = await getRandomConfession();
      setRandomConfession(confession);
      setShowRandomModal(true);
    } catch (err) {
      console.error("Failed to get random confession:", err);
      alert("Failed to get random confession. Please try again.");
    }
  };

  // Handle showing another random confession
  const handleShowAnother = () => {
    setShowRandomModal(false);
    setTimeout(() => handleGetRandomConfession(), 100);
  };

  return (
    <ErrorBoundary>
      <div className="confessions-page">
        <Navbar />

        <div className="confessions-main animate-fade-in-up">
          {/* Header Section */}
          <div className="confessions-header animate-fade-in-down">
            <div className="header-content">
              <h1 className="main-title">
                <span className="icon">🤐</span>
                Anonymous Confessions
              </h1>
              <p className="subtitle">
                Share your thoughts anonymously. No judgment, just
                understanding.
              </p>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="error-banner">
              <span>⚠️ Failed to load confessions: {error}</span>
              <button onClick={refresh} className="retry-btn">
                Retry
              </button>
            </div>
          )}

          {/* Reaction Error Display */}
          {reactionError && (
            <div className="reaction-error-banner">
              <span>⚠️ {reactionError}</span>
            </div>
          )}

          {/* Controls Section */}
          <div className="controls-section animate-fade-in-left">
            <div className="controls-left">
              {/* Filter */}
              <div className="filter-container">
                <label className="filter-label">Filter by:</label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="filter-select"
                  disabled={loading}
                >
                  <option value="all">All Confessions</option>
                  {TAGS.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort */}
              <div className="sort-container">
                <label className="sort-label">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="sort-select"
                  disabled={loading}
                >
                  <option value="recent">Most Recent</option>
                  <option value="mostReacted">Most Reacted</option>
                  <option value="mostVoted">Most Voted Poll</option>
                </select>
              </div>
            </div>

            <div className="controls-right">
              {/* Random Confession Button */}
              <button
                className="random-btn"
                onClick={handleGetRandomConfession}
                disabled={loading}
              >
                🎲 Feeling Curious?
              </button>

              {/* Submit Confession Button */}
              {isLoggedIn && (
                <button
                  className="submit-confession-btn"
                  onClick={() => setShowConfessionModal(true)}
                  disabled={loading}
                >
                  ✍️ Confess Anonymously
                </button>
              )}
            </div>
          </div>

          {/* Analytics Widget */}
          {analytics && (
            <div className="analytics-section">
              <AnalyticsWidget data={analytics} />
            </div>
          )}

          {/* Loading Spinner */}
          {loading && confessions.length === 0 && (
            <div className="loading-container">
              <LoadingSpinner />
              <p>Loading confessions...</p>
            </div>
          )}

          {/* Confessions Feed */}
          <div className="confessions-feed animate-fade-in-right">
            {hasConfessions ? (
              <div className="confessions-grid">
                {confessions.map((confession) => (
                  <ConfessionCard
                    key={confession.id}
                    confession={confession}
                    onReaction={handleReactionWithError}
                    onPollVote={handlePollVoteWithError}
                    disabled={loading}
                  />
                ))}

                {/* Load More Button */}
                {hasMore && (
                  <div className="load-more-container">
                    <button
                      className="load-more-btn"
                      onClick={loadMore}
                      disabled={loading}
                    >
                      {loading ? "Loading..." : "Load More Confessions"}
                    </button>
                  </div>
                )}
              </div>
            ) : !loading ? (
              <div className="no-confessions">
                <div className="no-confessions-icon">🤐</div>
                <h3>No confessions found</h3>
                <p>
                  {filter !== "all"
                    ? "Try adjusting your filters or be the first to confess in this category!"
                    : "Be the first to confess!"}
                </p>
                {isLoggedIn && (
                  <button
                    className="first-confession-btn"
                    onClick={() => setShowConfessionModal(true)}
                  >
                    Submit First Confession
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* Modals */}
        {showConfessionModal && (
          <ConfessionModal
            onSubmit={handleSubmitConfession}
            onClose={() => setShowConfessionModal(false)}
            tags={TAGS}
            submitting={submitting}
          />
        )}

        {showRandomModal && randomConfession && (
          <RandomConfessionModal
            confession={randomConfession}
            onClose={() => setShowRandomModal(false)}
            onShowAnother={handleShowAnother}
          />
        )}

        {/* Styles */}
        <style>{`
        .error-banner {
          background: #fee;
          border: 1px solid #fcc;
          color: #c33;
          padding: 12px 20px;
          border-radius: 8px;
          margin: 20px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .retry-btn {
          background: #c33;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .retry-btn:hover {
          background: #a22;
        }
        
        .reaction-error-banner {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          color: #856404;
          padding: 8px 16px;
          border-radius: 6px;
          margin: 10px 0;
          font-size: 14px;
        }
        
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: #666;
        }
        
        .analytics-section {
          margin: 20px 0;
        }
        
        .load-more-container {
          grid-column: 1 / -1;
          display: flex;
          justify-content: center;
          margin-top: 20px;
        }
        
        .load-more-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 25px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 600;
          transition: all 0.3s ease;
        }
        
        .load-more-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        
        .load-more-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .first-confession-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 25px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 600;
          margin-top: 20px;
          transition: all 0.3s ease;
        }
        
        .first-confession-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }

        @keyframes fade-in-down {
          0% { opacity: 0; transform: translateY(-30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-left {
          0% { opacity: 0; transform: translateX(-30px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes fade-in-right {
          0% { opacity: 0; transform: translateX(30px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        .animate-fade-in-down { animation: fade-in-down 0.7s cubic-bezier(.4,0,.2,1) both; }
        .animate-fade-in-up { animation: fade-in-up 0.7s cubic-bezier(.4,0,.2,1) both; }
        .animate-fade-in-left { animation: fade-in-left 0.7s cubic-bezier(.4,0,.2,1) both; }
        .animate-fade-in-right { animation: fade-in-right 0.7s cubic-bezier(.4,0,.2,1) both; }
      `}</style>
      </div>
    </ErrorBoundary>
  );
}
