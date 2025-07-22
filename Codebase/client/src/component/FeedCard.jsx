import React from 'react';
import './FeedCard.css';

export default function FeedCard({ post }) {
  return (
    <div className="feed-card">
      {post.type === 'video' ? (
        <video src={post.src} controls loop />
      ) : (
        <img src={post.src} alt={post.caption} />
      )}
      <p className="caption">{post.caption}</p>
      <div className="meta">
        <span>{post.user}</span> · <span>{post.time}</span>
      </div>
    </div>
  );
}
