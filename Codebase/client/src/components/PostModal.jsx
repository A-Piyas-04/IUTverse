import React, { useState, useRef, useEffect } from "react";
import { postService, commentService } from "../services/postService";
import { formatDistanceToNow } from "date-fns";

export default function PostModal({ post, onClose, refreshPosts }) {
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [comments, setComments] = useState([]);
  const modalRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch comments for this post
  useEffect(() => {
    const fetchComments = async () => {
      if (!post || !post.id) return;

      setIsLoading(true);
      try {
        const fetchedComments = await commentService.getPostComments(post.id);
        console.log("Fetched comments data:", fetchedComments);

        // Ensure we have valid comment data structure
        if (fetchedComments && Array.isArray(fetchedComments)) {
          setComments(fetchedComments);
        } else if (
          fetchedComments &&
          fetchedComments.comments &&
          Array.isArray(fetchedComments.comments)
        ) {
          setComments(fetchedComments.comments);
        } else if (
          fetchedComments &&
          fetchedComments.data &&
          Array.isArray(fetchedComments.data)
        ) {
          setComments(fetchedComments.data);
        } else {
          console.error("Invalid comments data format:", fetchedComments);
          setComments([]);
        }
      } catch (error) {
        console.error("Failed to fetch comments:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchComments();
  }, [post]);

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
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const parentCommentId = replyingTo ? replyingTo.id : null;
      await commentService.addComment(post.id, comment, parentCommentId);

      // Clear input and reset reply state
      setComment("");
      setReplyingTo(null);

      // Refresh comments
      const updatedComments = await commentService.getPostComments(post.id);
      setComments(updatedComments);

      // Refresh posts list if needed
      if (refreshPosts) refreshPosts();
    } catch (error) {
      console.error("Failed to submit comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReaction = async (type) => {
    try {
      await postService.reactToPost(post.id, type);
      if (refreshPosts) refreshPosts();
    } catch (error) {
      console.error(`Failed to ${type} post:`, error);
    }
  };

  // Format date function
  const formatDate = (dateString) => {
    if (!dateString) return "Unknown time";
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      console.error("Date formatting error:", error);
      return "Invalid date";
    }
  };

  // Get user profile picture
  const getProfilePic = (user) => {
    return (
      user?.profilePicture ||
      "https://www.wondercide.com/cdn/shop/articles/Upside_down_gray_cat.png?v=1685551065&width=1500"
    );
  };

  // Process image URLs to ensure they're properly formatted
  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return "";

    // Check if it's already a full URL
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return imageUrl;
    }

    // Check if it's a relative URL starting with a slash
    if (imageUrl.startsWith("/")) {
      // Get the base part of the API URL (without /api)
      const baseUrl =
        import.meta.env.VITE_API_URL || "http://localhost:3000/api";
      const baseServerUrl = baseUrl.replace(/\/api$/, ""); // Remove /api if present
      return `${baseServerUrl}${imageUrl}`;
    }

    // If it's just a filename, prepend the full API URL path to uploads
    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
    const baseServerUrl = baseUrl.replace(/\/api$/, ""); // Remove /api if present
    return `${baseServerUrl}/uploads/${imageUrl}`;
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
            src={getProfilePic(post.user)}
            alt="Profile"
            className="w-[45px] h-[45px] rounded-full mt-1 border-2 border-green-400"
          />
          <div className="flex-1">
            <h4 className="font-semibold text-lg text-gray-900">
              {post.user?.name || post.name || "Unknown User"}
            </h4>
            <p className="text-[13px] text-gray-500 flex items-center gap-1">
              {formatDate(post.createdAt || post.date)} •{" "}
              <span className="text-blue-500">🌐</span>
            </p>
          </div>
        </div>

        {/* Post Content */}
        <div className="px-6 pt-4 pb-2">
          <div className="text-[16px] mb-3 text-gray-900 leading-relaxed whitespace-pre-line">
            {post.content}
          </div>
          {(post.image || post.img) && (
            <img
              src={getImageUrl(post.image || post.img)}
              alt="Post"
              className="w-full h-auto rounded-lg mt-2 shadow-md max-h-[350px] object-contain"
              onError={(e) => {
                console.error(
                  "Image failed to load in modal:",
                  post.image || post.img
                );
                // Set a placeholder image on error
                e.target.src =
                  "https://via.placeholder.com/400x300?text=Image+Not+Available";
                e.target.onerror = null; // Prevent infinite error loop
              }}
            />
          )}
        </div>

        {/* Reactions and Counts */}
        <div className="flex justify-between items-center px-6 py-2 text-[14px] text-gray-600 border-b border-gray-100">
          <div className="flex items-center gap-1">
            <span className="text-blue-500">👍</span>
            <span className="text-red-500">❤️</span>
            <span className="ml-1">
              {post._count?.reactions || post.likes || 0}
            </span>
          </div>
          <div className="flex gap-4">
            <span>
              {post._count?.comments || post.commentsCount || 0} comments
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-around py-2 border-b border-gray-100">
          <button
            onClick={() => handleReaction("LIKE")}
            className="flex items-center justify-center gap-2 py-2 px-4 hover:bg-gray-100 rounded transition-colors text-gray-600 text-[15px] font-medium flex-1"
          >
            <span>👍</span>
            <span>Like</span>
          </button>
          <button
            onClick={() => inputRef.current?.focus()}
            className="flex items-center justify-center gap-2 py-2 px-4 hover:bg-gray-100 rounded transition-colors text-gray-600 text-[15px] font-medium flex-1"
          >
            <span>💬</span>
            <span>Comment</span>
          </button>
        </div>

        {/* Comments Section */}
        <div className="px-6 pt-4 pb-2">
          <h5 className="font-semibold text-[15px] mb-2">Comments</h5>
          <div className="max-h-[300px] overflow-y-auto pr-2 mb-3">
            {isLoading ? (
              <div className="text-center py-4">
                <span className="text-gray-500">Loading comments...</span>
              </div>
            ) : comments && comments.length > 0 ? (
              comments.map((comment, idx) => {
                console.log("Rendering comment:", idx, comment);
                return (
                  <div
                    key={comment.id || idx}
                    className="flex items-start gap-3 mb-4"
                  >
                    <img
                      src={getProfilePic(comment.user)}
                      alt={comment.user?.name || "User"}
                      className="w-[32px] h-[32px] rounded-full border border-green-300"
                    />
                    <div className="bg-gray-100 rounded-xl px-4 py-2 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-[14px] text-gray-800">
                          {comment.user?.name ||
                            comment.userName ||
                            "Anonymous"}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                      <div className="text-[14px] text-gray-700">
                        {comment.content ||
                          comment.text ||
                          "No comment content"}
                      </div>
                      {comment.content === undefined &&
                        comment.text === undefined && (
                          <div className="text-[12px] text-red-500">
                            Debug: {JSON.stringify(comment)}
                          </div>
                        )}
                    </div>
                  </div>
                );
              })
            ) : post.comments && post.comments.length > 0 ? (
              post.comments.map((c, i) => (
                <div key={i} className="flex items-start gap-3 mb-4">
                  <img
                    src="https://www.wondercide.com/cdn/shop/articles/Upside_down_gray_cat.png?v=1685551065&width=1500"
                    alt={c.name}
                    className="w-[32px] h-[32px] rounded-full border border-green-300"
                  />
                  <div className="bg-gray-100 rounded-xl px-4 py-2 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-[14px] text-gray-800">
                        {c.name}
                      </span>
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
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 mt-2"
          >
            <img
              src="https://www.wondercide.com/cdn/shop/articles/Upside_down_gray_cat.png?v=1685551065&width=1500"
              alt="Me"
              className="w-[30px] h-[30px] rounded-full"
            />
            <input
              ref={inputRef}
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                replyingTo
                  ? `Reply to ${replyingTo.user?.name}...`
                  : "Write a comment..."
              }
              className="flex-1 px-3 py-2 rounded-full bg-gray-100 text-[14px] outline-none border border-gray-200"
              disabled={isSubmitting}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className={`bg-green-500 text-white px-4 py-2 rounded-full font-semibold hover:bg-green-600 transition ${
                isSubmitting ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {isSubmitting ? "Posting..." : "Post"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
