import React, { useState, useRef, useEffect } from "react";

export default function PostModal({ post, onClose, onCommentSubmit }) {
  const [comment, setComment] = useState("");
  const modalRef = useRef(null);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Focus input on open
  const inputRef = useRef(null);
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    onCommentSubmit(post.id, {
      name: "You",
      text: comment,
      time: "Just now",
    });
    setComment("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        ref={modalRef}
        className="relative bg-white rounded-2xl shadow-2xl max-w-[700px] w-full mx-2 md:mx-0 max-h-[90vh] overflow-y-auto animate-fade-in-up"
      >
        {/* Close Button */}
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl font-bold z-10"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        {/* Post Header */}
        <div className="flex items-start gap-3 p-6 pb-3 border-b border-gray-100">
          <img
            src="https://www.wondercide.com/cdn/shop/articles/Upside_down_gray_cat.png?v=1685551065&width=1500"
            alt="Profile"
            className="w-[45px] h-[45px] rounded-full mt-1 border-2 border-green-400"
          />
          <div className="flex-1">
            <h4 className="font-semibold text-lg text-gray-900">{post.name}</h4>
            <p className="text-[13px] text-gray-500 flex items-center gap-1">
              {post.date} • <span className="text-blue-500">🌐</span>
            </p>
          </div>
        </div>
        {/* Post Content */}
        <div className="px-6 pt-4 pb-2">
          <div className="text-[16px] mb-3 text-gray-900 leading-relaxed whitespace-pre-line">
            {post.content}
          </div>
          {post.img && (
            <img
              src={post.img}
              alt="Post"
              className="w-full h-auto rounded-lg mt-2 shadow-md max-h-[350px] object-contain"
            />
          )}
        </div>
        {/* Reactions and Counts */}
        <div className="flex justify-between items-center px-6 py-2 text-[14px] text-gray-600 border-b border-gray-100">
          <div className="flex items-center gap-1">
            <span className="text-blue-500">👍</span>
            <span className="text-red-500">❤️</span>
            <span className="ml-1">{post.likes}</span>
          </div>
          <div className="flex gap-4">
            <span>{post.commentsCount} comments</span>
            <span>{post.shares} shares</span>
          </div>
        </div>
        {/* Action Buttons */}
        <div className="flex justify-around py-2 border-b border-gray-100">
          <button className="flex items-center justify-center gap-2 py-2 px-4 hover:bg-gray-100 rounded transition-colors text-gray-600 text-[15px] font-medium flex-1">
            <span>👍</span>
            <span>Like</span>
          </button>
          <button className="flex items-center justify-center gap-2 py-2 px-4 hover:bg-gray-100 rounded transition-colors text-gray-600 text-[15px] font-medium flex-1">
            <span>💬</span>
            <span>Comment</span>
          </button>
          <button className="flex items-center justify-center gap-2 py-2 px-4 hover:bg-gray-100 rounded transition-colors text-gray-600 text-[15px] font-medium flex-1">
            <span>↗️</span>
            <span>Share</span>
          </button>
        </div>
        {/* Comments Section */}
        <div className="px-6 pt-4 pb-2">
          <h5 className="font-semibold text-[15px] mb-2">Comments</h5>
          <div className="max-h-[300px] overflow-y-auto pr-2 mb-3">
            {post.comments && post.comments.length > 0 ? (
              post.comments.map((c, i) => (
                <div key={i} className="flex items-start gap-3 mb-4">
                  <img
                    src="https://www.wondercide.com/cdn/shop/articles/Upside_down_gray_cat.png?v=1685551065&width=1500"
                    alt={c.name}
                    className="w-[32px] h-[32px] rounded-full border border-green-300"
                  />
                  <div className="bg-gray-100 rounded-xl px-4 py-2 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-[14px] text-gray-800">{c.name}</span>
                      <span className="text-xs text-gray-400">{c.time}</span>
                    </div>
                    <div className="text-[14px] text-gray-700">{c.text}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-gray-400 text-sm">No comments yet.</div>
            )}
          </div>
          {/* Add Comment Input */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-2">
            <img
              src="https://www.wondercide.com/cdn/shop/articles/Upside_down_gray_cat.png?v=1685551065&width=1500"
              alt="Me"
              className="w-[30px] h-[30px] rounded-full"
            />
            <input
              ref={inputRef}
              type="text"
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 px-3 py-2 rounded-full bg-gray-100 text-[14px] outline-none border border-gray-200"
            />
            <button
              type="submit"
              className="bg-green-500 text-white px-4 py-2 rounded-full font-semibold hover:bg-green-600 transition"
            >
              Post
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 