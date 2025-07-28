import React, { useState, useMemo } from "react";
import Navbar from "../../components/Navbar/Navbar.jsx";
import ConfessionCard from "./components/ConfessionCard.jsx";
import ConfessionModal from "./components/ConfessionModal.jsx";
import AnalyticsWidget from "./components/AnalyticsWidget.jsx";
import RandomConfessionModal from "./components/RandomConfessionModal.jsx";
import "./Confessions.css";

// Sample data - in a real app, this would come from a database
const SAMPLE_CONFESSIONS = [
  {
    id: 1,
    content:
      "I've been pretending to understand quantum physics in class for the past 3 weeks. The professor thinks I'm brilliant, but I'm just nodding and saying 'fascinating' at random intervals. 😅",
    tag: "Academic Stress",
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    reactions: { like: 45, funny: 23, relatable: 67, angry: 2, insightful: 12 },
    poll: {
      question: "How many of you fake understanding complex topics?",
      options: [
        { text: "All the time", votes: 156, percentage: 45 },
        { text: "Sometimes", votes: 89, percentage: 26 },
        { text: "Rarely", votes: 67, percentage: 19 },
        { text: "Never", votes: 34, percentage: 10 },
      ],
      totalVotes: 346,
    },
    status: "approved",
  },
  {
    id: 2,
    content:
      "My roommate and I have been having a silent war over the thermostat. I like it cold, they like it warm. We've been secretly adjusting it when the other isn't looking. It's been 2 months of this passive-aggressive battle. 🥶",
    tag: "Hall Life",
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    reactions: {
      like: 89,
      funny: 156,
      relatable: 234,
      angry: 5,
      insightful: 23,
    },
    status: "approved",
  },
  {
    id: 3,
    content:
      "I accidentally sent a love confession meant for my crush to my professor instead. The subject line was 'I can't stop thinking about you' and I only realized after hitting send. I'm considering transferring to a different university. 😭",
    tag: "Funny",
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
    reactions: {
      like: 234,
      funny: 567,
      relatable: 89,
      angry: 12,
      insightful: 45,
    },
    status: "approved",
  },
  {
    id: 4,
    content:
      "I found a stray cat near the library and secretly feed it every day. I've named it Professor Whiskers and it's become my unofficial therapy session. Sometimes I tell it about my problems and it just purrs. Best listener ever. 🐱",
    tag: "Wholesome",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    reactions: {
      like: 456,
      funny: 23,
      relatable: 123,
      angry: 1,
      insightful: 78,
    },
    poll: {
      question: "Should I adopt Professor Whiskers?",
      options: [
        { text: "Yes! Give it a home!", votes: 234, percentage: 78 },
        { text: "Keep it as a campus cat", votes: 45, percentage: 15 },
        { text: "Find it a proper home", votes: 21, percentage: 7 },
      ],
      totalVotes: 300,
    },
    status: "approved",
  },
  {
    id: 5,
    content:
      "I've been using the same pen for 3 years. It's not even a good pen, but I'm emotionally attached to it. I've lost it twice and had mini panic attacks until I found it. My friends think I'm weird, but this pen has been through everything with me. ✏️",
    tag: "Wholesome",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    reactions: {
      like: 189,
      funny: 67,
      relatable: 234,
      angry: 3,
      insightful: 45,
    },
    status: "approved",
  },
];

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
  const [confessions, setConfessions] = useState(SAMPLE_CONFESSIONS);
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [showConfessionModal, setShowConfessionModal] = useState(false);
  const [showRandomModal, setShowRandomModal] = useState(false);
  const [isLoggedIn] = useState(true); // Mock login state

  // Filter and sort confessions
  const filteredAndSortedConfessions = useMemo(() => {
    let filtered = confessions.filter(
      (confession) => filter === "all" || confession.tag === filter
    );

    switch (sortBy) {
      case "recent":
        return filtered.sort((a, b) => b.timestamp - a.timestamp);
      case "mostReacted":
        return filtered.sort((a, b) => {
          const aTotal = Object.values(a.reactions).reduce(
            (sum, val) => sum + val,
            0
          );
          const bTotal = Object.values(b.reactions).reduce(
            (sum, val) => sum + val,
            0
          );
          return bTotal - aTotal;
        });
      case "mostVoted":
        return filtered.sort((a, b) => {
          const aVotes = a.poll ? a.poll.totalVotes : 0;
          const bVotes = b.poll ? b.poll.totalVotes : 0;
          return bVotes - aVotes;
        });
      default:
        return filtered;
    }
  }, [confessions, filter, sortBy]);

  // Handle new confession submission
  const handleSubmitConfession = (confessionData) => {
    const newConfession = {
      id: Date.now(),
      content: confessionData.content,
      tag: confessionData.tag,
      timestamp: new Date(),
      reactions: { like: 0, funny: 0, relatable: 0, angry: 0, insightful: 0 },
      poll: confessionData.poll || null,
      status: "pending", // In real app, would go to moderation queue
    };

    setConfessions((prev) => [newConfession, ...prev]);
    setShowConfessionModal(false);
  };

  // Handle reaction updates
  const handleReaction = (confessionId, reactionType) => {
    setConfessions((prev) =>
      prev.map((confession) =>
        confession.id === confessionId
          ? {
              ...confession,
              reactions: {
                ...confession.reactions,
                [reactionType]: confession.reactions[reactionType] + 1,
              },
            }
          : confession
      )
    );
  };

  // Handle poll voting
  const handlePollVote = (confessionId, optionIndex) => {
    setConfessions((prev) =>
      prev.map((confession) => {
        if (confession.id === confessionId && confession.poll) {
          const updatedPoll = { ...confession.poll };
          updatedPoll.options[optionIndex].votes += 1;
          updatedPoll.totalVotes += 1;

          // Recalculate percentages
          updatedPoll.options = updatedPoll.options.map((option) => ({
            ...option,
            percentage: Math.round(
              (option.votes / updatedPoll.totalVotes) * 100
            ),
          }));

          return { ...confession, poll: updatedPoll };
        }
        return confession;
      })
    );
  };

  // Get random confession
  const getRandomConfession = () => {
    const approvedConfessions = confessions.filter(
      (c) => c.status === "approved"
    );
    if (approvedConfessions.length === 0) return null;
    return approvedConfessions[
      Math.floor(Math.random() * approvedConfessions.length)
    ];
  };

  // Analytics data
  const analyticsData = useMemo(() => {
    const totalConfessions = confessions.length;
    const tagCounts = {};
    confessions.forEach((c) => {
      tagCounts[c.tag] = (tagCounts[c.tag] || 0) + 1;
    });
    const topTags = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([tag, count]) => ({ tag, count }));

    const mostReacted = confessions.reduce(
      (max, confession) => {
        const total = Object.values(confession.reactions).reduce(
          (sum, val) => sum + val,
          0
        );
        return total > max.total ? { confession, total } : max;
      },
      { confession: null, total: 0 }
    );

    const mostVotedPoll = confessions
      .filter((c) => c.poll)
      .reduce(
        (max, confession) => {
          return confession.poll.totalVotes > max.poll.totalVotes
            ? confession
            : max;
        },
        { poll: { totalVotes: 0 } }
      );

    return { totalConfessions, topTags, mostReacted, mostVotedPoll };
  }, [confessions]);

  return (
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
              Share your thoughts anonymously. No judgment, just understanding.
            </p>
          </div>
        </div>

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
              onClick={() => setShowRandomModal(true)}
            >
              🎲 Feeling Curious?
            </button>

            {/* Submit Confession Button */}
            {isLoggedIn && (
              <button
                className="submit-confession-btn"
                onClick={() => setShowConfessionModal(true)}
              >
                ✍️ Confess Anonymously
              </button>
            )}
          </div>
        </div>

        {/* Confessions Feed */}
        <div className="confessions-feed animate-fade-in-right">
          {filteredAndSortedConfessions.length > 0 ? (
            <div className="confessions-grid">
              {filteredAndSortedConfessions.map((confession) => (
                <ConfessionCard
                  key={confession.id}
                  confession={confession}
                  onReaction={handleReaction}
                  onPollVote={handlePollVote}
                />
              ))}
            </div>
          ) : (
            <div className="no-confessions">
              <div className="no-confessions-icon">🤐</div>
              <h3>No confessions found</h3>
              <p>Try adjusting your filters or be the first to confess!</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showConfessionModal && (
        <ConfessionModal
          onSubmit={handleSubmitConfession}
          onClose={() => setShowConfessionModal(false)}
          tags={TAGS}
        />
      )}

      {showRandomModal && (
        <RandomConfessionModal
          confession={getRandomConfession()}
          onClose={() => setShowRandomModal(false)}
          onShowAnother={() => setShowRandomModal(false)}
        />
      )}
      {/* Animations */}
      <style>{`
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
  );
}
