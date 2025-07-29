import React from "react";

export default function FeedCard({ post }) {
  return (
    <div className="feed-card transition-shadow duration-200 hover:shadow-lg relative">
      <div className="flex items-center gap-2 px-4 pt-3 pb-1">
        <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-lg shadow-sm">
          {post.user ? post.user[0].toUpperCase() : "?"}
        </div>
        <div>
          <div className="font-semibold text-green-900">{post.user}</div>
          <div className="text-xs text-gray-400">{post.time || "Just now"}</div>
        </div>
      </div>
      {post.type === "video" ? (
        <video
          src={post.image}
          controls
          className="w-full aspect-square object-cover"
          style={{ background: "#f3f3f3" }}
        />
      ) : (
        <img
          src={post.image}
          alt="cat"
          className="w-full aspect-square object-cover"
          loading="lazy"
        />
      )}
      <div className="caption flex items-center gap-2 mt-2">
        <span className="text-gray-700 text-sm">{post.caption}</span>
      </div>
      <div className="meta flex justify-between items-center mt-1">
        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-1 text-green-600 hover:text-green-800 text-xs font-medium px-2 py-1 rounded transition-colors duration-150"
            title="Like"
            style={{ background: "rgba(34,197,94,0.07)" }}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 20 20">
              <path d="M3.172 10.828a4 4 0 0 1 0-5.656c1.562-1.562 4.095-1.562 5.657 0L10 6.343l1.172-1.171c1.562-1.562 4.095-1.562 5.657 0a4 4 0 0 1 0 5.656l-6.364 6.364a1 1 0 0 1-1.414 0l-6.364-6.364z" fill="currentColor"/>
            </svg>
            Like
          </button>
          <button
            className="flex items-center gap-1 text-gray-500 hover:text-green-700 text-xs font-medium px-2 py-1 rounded transition-colors duration-150"
            title="Comment"
            style={{ background: "rgba(16,185,129,0.05)" }}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 20 20">
              <path d="M18 10c0 3.866-3.582 7-8 7a8.96 8.96 0 0 1-3.39-.62l-3.11.89a1 1 0 0 1-1.26-1.26l.89-3.11A8.96 8.96 0 0 1 3 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" fill="currentColor"/>
            </svg>
            Comment
          </button>
        </div>
        <span className="text-xs text-gray-400">{post.time || "Just now"}</span>
      </div>
    </div>
  );
}
