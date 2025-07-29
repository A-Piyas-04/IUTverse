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

          {/* Main Content - 3 Column Layout */}
          <div className="main-content-layout">
            {/* Left Column - Analytics Widget */}
            <div className="left-column -mt-[20px]">
              {analytics && (
                <div className="analytics-section">
                  <AnalyticsWidget data={analytics} />
                </div>
              )}
            </div>

            {/* Middle Column - Confessions Feed */}
            <div className="middle-column">
              {/* Create New Confession Card */}
              {isLoggedIn && (
                <div className="create-confession-card animate-fade-in-up">
                  <div className="create-card-content">
                    <div className="create-card-icon">✍️</div>
                    <div className="create-card-text">
                      <h3>Share Your Thoughts</h3>
                      <p>
                        What's on your mind? Share it anonymously with the
                        community.
                      </p>
                    </div>
                    <button
                      className="create-card-btn"
                      onClick={() => setShowConfessionModal(true)}
                      disabled={loading}
                    >
                      Create Confession
                    </button>
                  </div>
                  <div className="create-card-background">
                    <div className="floating-emoji">🤐</div>
                    <div className="floating-emoji">💭</div>
                    <div className="floating-emoji">✨</div>
                  </div>
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

            {/* Right Column - Controls */}
            <div className="right-column">
              {/* Controls Section */}
              <div className="controls-section animate-fade-in-left max-w-[250px]">
                <div className="controls-left">
                  {/* Filter */}
                  <div className="filter-container ">
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
                </div>
              </div>
            </div>
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
        * {
          box-sizing: border-box;
        }
        
        .confessions-page {
          overflow-x: hidden;
          max-width: 100vw;
        }
        
        .confessions-main {
          overflow-x: hidden;
          max-width: 100vw;
        }
        
        .main-content-layout {
          display: grid;
          grid-template-columns: minmax(250px, 1fr) minmax(600px, 800px) minmax(250px, 300px);
          gap: 1.5rem;
          max-width: 100vw;
          margin: 0 auto;
          padding: 0 1rem;
          overflow-x: hidden;
        }
        
        .left-column {
          display: flex;
          flex-direction: column;
        }
        
        .middle-column {
          display: flex;
          flex-direction: column;
        }
        
        .right-column {
          display: flex;
          flex-direction: column;
        }
        
        /* Right column controls styling */
        .right-column .controls-section {
          background: white;
          padding: 1.5rem;
          margin: 0;
          border-radius: 20px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(10px);
          position: sticky;
          top: 100px;
          max-width: 100%;
          overflow: hidden;
        }
        
        .right-column .controls-left {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          width: 100%;
          margin-bottom: 1.5rem;
        }
        
        .right-column .controls-right {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          width: 100%;
        }
        
        .right-column .filter-container,
        .right-column .sort-container {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          width: 100%;
        }
        
        .right-column .filter-select,
        .right-column .sort-select {
          width: 100%;
          min-width: auto;
          max-width: 100%;
          box-sizing: border-box;
        }
        
        /* Create Confession Card */
        .create-confession-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 20px;
          padding: 2rem;
          margin-bottom: 2rem;
          position: relative;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
          transition: all 0.3s ease;
        }
        
        .create-confession-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 40px rgba(102, 126, 234, 0.4);
        }
        
        .create-card-content {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 1.5rem;
          color: white;
        }
        
        .create-card-icon {
          font-size: 3rem;
          animation: bounce 2s infinite;
        }
        
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-10px); }
          60% { transform: translateY(-5px); }
        }
        
        .create-card-text {
          flex: 1;
        }
        
        .create-card-text h3 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 0 0.5rem 0;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);
        }
        
        .create-card-text p {
          font-size: 1rem;
          opacity: 0.9;
          margin: 0;
          font-weight: 300;
        }
        
        .create-card-btn {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.3);
          padding: 0.75rem 1.5rem;
          border-radius: 50px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
          white-space: nowrap;
        }
        
        .create-card-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.3);
          border-color: rgba(255, 255, 255, 0.5);
          transform: scale(1.05);
        }
        
        .create-card-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .create-card-background {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          overflow: hidden;
          z-index: 1;
        }
        
        .floating-emoji {
          position: absolute;
          font-size: 2rem;
          opacity: 0.1;
          animation: float 6s ease-in-out infinite;
        }
        
        .floating-emoji:nth-child(1) {
          top: 20%;
          right: 10%;
          animation-delay: 0s;
        }
        
        .floating-emoji:nth-child(2) {
          top: 60%;
          right: 20%;
          animation-delay: 2s;
        }
        
        .floating-emoji:nth-child(3) {
          top: 40%;
          right: 5%;
          animation-delay: 4s;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        
        /* Enhanced Submit Button */
        .enhanced-submit-btn {
          background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 25px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3);
          position: relative;
          overflow: hidden;
        }
        
        .enhanced-submit-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s;
        }
        
        .enhanced-submit-btn:hover::before {
          left: 100%;
        }
        
        .enhanced-submit-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
        }
        
        .btn-icon {
          font-size: 1.2rem;
          animation: pulse-icon 2s infinite;
        }
        
        @keyframes pulse-icon {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        
        .btn-text {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          line-height: 1.2;
        }
        
        .btn-main {
          font-weight: 700;
          font-size: 0.95rem;
        }
        
        .btn-sub {
          font-weight: 400;
          font-size: 0.75rem;
          opacity: 0.8;
        }
        
        /* Responsive adjustments for the 3-column layout */
        @media (max-width: 1200px) {
          .main-content-layout {
            grid-template-columns: minmax(200px, 250px) 1fr minmax(200px, 250px);
            gap: 1rem;
            padding: 0 0.5rem;
          }
        }
        
        @media (max-width: 992px) {
          .main-content-layout {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
          
          .left-column {
            order: 3;
          }
          
          .middle-column {
            order: 1;
          }
          
          .right-column {
            order: 2;
          }
          
          .right-column .controls-section {
            position: static;
            margin: 2rem 0;
          }
          
          .right-column .controls-left {
            flex-direction: row;
            flex-wrap: wrap;
            gap: 1rem;
            margin-bottom: 1rem;
          }
          
          .right-column .controls-right {
            flex-direction: row;
            justify-content: center;
          }
          
          .right-column .filter-container,
          .right-column .sort-container {
            flex: 1;
            min-width: 200px;
          }
          
          .create-card-content {
            flex-direction: column;
            text-align: center;
            gap: 1rem;
          }
          
          .create-card-text {
            text-align: center;
          }
          
          .enhanced-submit-btn {
            padding: 0.75rem 1.5rem;
          }
          
          .btn-text {
            align-items: center;
          }
        }
        
        @media (max-width: 768px) {
          .main-content-layout {
            padding: 0 0.25rem;
            gap: 1rem;
          }
          
          .create-confession-card {
            padding: 1.5rem;
            margin-bottom: 1.5rem;
          }
          
          .create-card-icon {
            font-size: 2.5rem;
          }
          
          .create-card-text h3 {
            font-size: 1.3rem;
          }
          
          .create-card-text p {
            font-size: 0.9rem;
          }
          
          .create-card-btn {
            padding: 0.6rem 1.2rem;
            font-size: 0.9rem;
          }
          
          .right-column .controls-section {
            padding: 1rem;
          }
        }
        
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
