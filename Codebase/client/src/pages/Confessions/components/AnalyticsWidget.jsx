import React from "react";
import "./AnalyticsWidget.css";

export default function AnalyticsWidget({ data }) {
  const { totalConfessions, topTags, mostReacted, mostVotedPoll } = data;

  return (
    <div className="analytics-widget">
      <div className="analytics-header">
        <h3 className="analytics-title">📊 Confession Insights</h3>
        <span className="analytics-subtitle">Community Statistics</span>
      </div>

      <div className="analytics-grid">
        {/* Total Confessions */}
        <div className="analytics-card">
          <div className="card-icon">🤐</div>
          <div className="card-content">
            <div className="card-value">{totalConfessions}</div>
            <div className="card-label">Total Confessions</div>
          </div>
        </div>

        {/* Top Tags */}
        <div className="analytics-card">
          <div className="card-icon">🏷️</div>
          <div className="card-content">
            <div className="card-label">Top Categories</div>
            <div className="tags-list">
              {topTags.map((tag, index) => (
                <div key={tag.tag} className="tag-item">
                  <span className="tag-rank">#{index + 1}</span>
                  <span className="tag-name">{tag.tag}</span>
                  <span className="tag-count">({tag.count})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Most Reacted */}
        <div className="analytics-card">
          <div className="card-icon">🔥</div>
          <div className="card-content">
            <div className="card-label">Most Reacted</div>
            {mostReacted.confession ? (
              <div className="reaction-preview">
                <div className="reaction-text">
                  {mostReacted.confession.content.length > 60
                    ? `${mostReacted.confession.content.substring(0, 60)}...`
                    : mostReacted.confession.content}
                </div>
                <div className="reaction-count">
                  {mostReacted.total} reactions
                </div>
              </div>
            ) : (
              <div className="no-data">No reactions yet</div>
            )}
          </div>
        </div>

        {/* Most Voted Poll */}
        <div className="analytics-card">
          <div className="card-icon">📊</div>
          <div className="card-content">
            <div className="card-label">Most Voted Poll</div>
            {mostVotedPoll.poll && mostVotedPoll.poll.totalVotes > 0 ? (
              <div className="poll-preview">
                <div className="poll-question">
                  {mostVotedPoll.poll.question.length > 40
                    ? `${mostVotedPoll.poll.question.substring(0, 40)}...`
                    : mostVotedPoll.poll.question}
                </div>
                <div className="poll-votes">
                  {mostVotedPoll.poll.totalVotes} votes
                </div>
              </div>
            ) : (
              <div className="no-data">No polls yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
