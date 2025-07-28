import React, { useState } from "react";

export default function FeedCard({ post, onLike, onComment }) {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || submittingComment) return;
    
    setSubmittingComment(true);
    try {
      await onComment(newComment);
      setNewComment('');
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmittingComment(false);
    }
  };
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
            className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded transition-colors duration-150 ${
              post.isLiked 
                ? 'text-red-600 hover:text-red-800' 
                : 'text-green-600 hover:text-green-800'
            }`}
            title={post.isLiked ? "Unlike" : "Like"}
            style={{ background: post.isLiked ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.07)" }}
            onClick={onLike}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 20 20">
              <path 
                d="M3.172 10.828a4 4 0 0 1 0-5.656c1.562-1.562 4.095-1.562 5.657 0L10 6.343l1.172-1.171c1.562-1.562 4.095-1.562 5.657 0a4 4 0 0 1 0 5.656l-6.364 6.364a1 1 0 0 1-1.414 0l-6.364-6.364z" 
                fill={post.isLiked ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth={post.isLiked ? "0" : "1.5"}
              />
            </svg>
            {post.likes || 0} {post.isLiked ? 'Liked' : 'Like'}
          </button>
          <button
            className="flex items-center gap-1 text-gray-500 hover:text-green-700 text-xs font-medium px-2 py-1 rounded transition-colors duration-150"
            title="Comment"
            style={{ background: "rgba(16,185,129,0.05)" }}
            onClick={() => setShowComments(!showComments)}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 20 20">
              <path d="M18 10c0 3.866-3.582 7-8 7a8.96 8.96 0 0 1-3.39-.62l-3.11.89a1 1 0 0 1-1.26-1.26l.89-3.11A8.96 8.96 0 0 1 3 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" fill="currentColor"/>
            </svg>
            {post.commentCount || 0} Comment{(post.commentCount || 0) !== 1 ? 's' : ''}
          </button>
        </div>
        <span className="text-xs text-gray-400">{post.time || "Just now"}</span>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="comments-section mt-3 pt-3 border-t border-gray-200">
          {/* Existing Comments */}
          {post.comments && post.comments.length > 0 && (
            <div className="existing-comments mb-3 max-h-40 overflow-y-auto">
              {post.comments.map((comment, index) => (
                <div key={comment.id || index} className="comment mb-2 p-2 bg-gray-50 rounded text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xs">
                      {comment.user?.name ? comment.user.name[0].toUpperCase() : comment.author?.[0]?.toUpperCase() || '?'}
                    </div>
                    <span className="font-medium text-xs text-gray-700">
                      {comment.user?.name || comment.author || 'Anonymous'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : 'Just now'}
                    </span>
                  </div>
                  <p className="text-gray-700 text-xs ml-8">{comment.content}</p>
                </div>
              ))}
            </div>
          )}
          
          {/* Add Comment Form */}
          <form onSubmit={handleSubmitComment} className="add-comment-form">
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                disabled={submittingComment}
              />
              <button
                type="submit"
                disabled={!newComment.trim() || submittingComment}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
              >
                {submittingComment ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
