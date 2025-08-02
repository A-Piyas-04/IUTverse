import React, { useState, useRef, useEffect } from 'react';
import './PostModal.css';
import { toggleLike, addComment } from '../../../services/catPostApi';
import { authUtils } from '../../../utils/auth';

export default function PostModal({ post, isOpen, onClose, onCommentSubmit, onPostUpdate }) {
  // Get current user ID to check if user has liked the post
  const getCurrentUserId = () => {
    const userData = authUtils.getUserData();
    return userData?.id;
  };

  const currentUserId = getCurrentUserId();
  
  // Check if current user has liked this post
  const userHasLiked = post?.likes?.some(like => like.userId === currentUserId) || false;
  
  const [comment, setComment] = useState('');
  const [isLiked, setIsLiked] = useState(userHasLiked);
  const [likeCount, setLikeCount] = useState(post?.likes?.length || 0);
  const [comments, setComments] = useState(post?.comments || []);
  
  // Update comments and like state when post prop changes
  useEffect(() => {
    setComments(post?.comments || []);
    const userHasLiked = post?.likes?.some(like => like.userId === currentUserId) || false;
    setIsLiked(userHasLiked);
    setLikeCount(post?.likes?.length || 0);
  }, [post, currentUserId]);
  const modalRef = useRef(null);
  const inputRef = useRef(null);

  const DISABLE_AUTH_FOR_TESTING = true;

  useEffect(() => {
    function handleClickOutside(event) {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose, isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  const handleLike = async () => {
    // Skip auth check if testing flag is enabled
    if (!DISABLE_AUTH_FOR_TESTING && !currentUserId) {
      alert('Please log in to like posts');
      return;
    }

    try {
      if (DISABLE_AUTH_FOR_TESTING) {
        // Simulate successful like toggle for testing
        setIsLiked(!isLiked);
        setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
      } else {
        // Call API to toggle like
        const response = await toggleLike(post.id);
        
        if (response.success) {
          setIsLiked(!isLiked);
          setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
          
          // Notify parent component of the update
          if (onPostUpdate) {
            onPostUpdate(post.id, { 
              likes: isLiked ? likeCount - 1 : likeCount + 1 
            });
          }
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      if (!DISABLE_AUTH_FOR_TESTING) {
        alert(error.message || 'Failed to toggle like');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    
    try {
      // Call the backend API to persist the comment
      if (!DISABLE_AUTH_FOR_TESTING) {
        const response = await addComment(post.id, comment.trim());
        if (!response.success) {
          alert('Failed to add comment');
          return;
        }
      }
      
      const newComment = {
        name: "You",
        text: comment,
        time: "Just now",
      };
      
      // Update local comments state
      setComments(prev => [...prev, newComment]);
      
      // Call parent's comment submit handler if provided
      if (onCommentSubmit) {
        onCommentSubmit(post.id, newComment);
      }
      
      // Update post in parent component if onPostUpdate is provided
      if (onPostUpdate) {
        onPostUpdate(post.id, { 
          comments: [...comments, newComment],
          commentsCount: comments.length + 1
        });
      }
      
      setComment("");
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment. Please try again.');
    }
  };

  if (!isOpen || !post) return null;

  return (
    <div className="postmodal-overlay">
      <div ref={modalRef} className="postmodal-container">
        <button className="postmodal-close" onClick={onClose} aria-label="Close">×</button>

        <div className="postmodal-header">
          <div className="postmodal-avatar">{post.user ? post.user[0].toUpperCase() : "?"}</div>
          <div className="postmodal-userinfo">
            <h4>{post.user}</h4>
            <p>{post.time || "Just now"} • <span>🐱</span></p>
          </div>
        </div>

        <div className="postmodal-content">
          <div className="postmodal-caption">{post.caption}</div>
          {post.image && (
            <div className="postmodal-media">
              {post.type === "video" ? (
                <video src={post.image} controls />
              ) : (
                <img 
                  src={post.image} 
                  alt="cat" 
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjZjNmM2YzIi8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiPkltYWdlIG5vdCBhdmFpbGFibGU8L3RleHQ+Cjwvc3ZnPg==';
                  }}
                />
              )}
            </div>
          )}
        </div>

        <div className="postmodal-reactions">
          <div><span className="heart">❤️</span> <span>{likeCount}</span></div>
          <div>{comments.length} comments</div>
        </div>

        <div className="postmodal-actions">
          <button onClick={handleLike} className={`action-btn ${isLiked ? 'liked' : ''}`}>
            <span>❤️</span> <span>Like</span>
          </button>
          <button className="action-btn"><span>💬</span> <span>Comment</span></button>
          <button className="action-btn"><span>↗️</span> <span>Share</span></button>
        </div>

        <div className="postmodal-comments">
          <h5>Comments</h5>
          <div className="comments-scroll">
            {comments.length > 0 ? (
              comments.map((c, i) => (
                <div key={i} className="comment">
                  <div className="comment-avatar">{c.name ? c.name[0].toUpperCase() : "?"}</div>
                  <div className="comment-body">
                    <div className="comment-meta">
                      <span className="comment-name">{c.name}</span>
                      <span className="comment-time">{c.time}</span>
                    </div>
                    <div className="comment-text">{c.text}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-comments">No comments yet.</div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="comment-form">
            <div className="comment-form-avatar">Y</div>
            <input
              ref={inputRef}
              type="text"
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Write a comment..."
            />
            <button type="submit">Post</button>
          </form>
        </div>
      </div>
    </div>
  );
}
