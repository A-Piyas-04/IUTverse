import React, { useState, useEffect } from 'react';
import { toggleLike, addComment } from '../../../services/catPostApi';
import './PostModal.css';

export default function PostModal({ post, isOpen, onClose, onPostUpdate }) {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post?.likes || 0);
  const [commentCount, setCommentCount] = useState(post?.comments || 0);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isTogglingLike, setIsTogglingLike] = useState(false);
  const [comments, setComments] = useState([]);

  // Temporary flag to disable auth checks - can be easily toggled later
  const DISABLE_AUTH_FOR_TESTING = true;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Load comments when modal opens
      // For now, we'll show placeholder comments
      setComments([
        // Placeholder comments - replace with actual API call later
      ]);
    } else {
      document.body.style.overflow = 'unset';
    }

    // Handle Esc key
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleLike = async () => {
    // Skip auth check if testing flag is enabled
    if (!DISABLE_AUTH_FOR_TESTING) {
      // Original auth check would go here
      // if (!isAuthenticated()) {
      //   alert('Please log in to like posts');
      //   return;
      // }
    }

    if (isTogglingLike) return;

    try {
      setIsTogglingLike(true);
      
      if (DISABLE_AUTH_FOR_TESTING) {
        // Simulate successful like toggle for testing
        setIsLiked(!isLiked);
        setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
        
        if (onPostUpdate) {
          onPostUpdate(post.id, { likes: isLiked ? likeCount - 1 : likeCount + 1 });
        }
      } else {
        // Original API call
        const response = await toggleLike(post.id);
        if (response.success) {
          setIsLiked(!isLiked);
          setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
          
          if (onPostUpdate) {
            onPostUpdate(post.id, { likes: isLiked ? likeCount - 1 : likeCount + 1 });
          }
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      if (!DISABLE_AUTH_FOR_TESTING) {
        alert(error.message || 'Failed to toggle like');
      }
    } finally {
      setIsTogglingLike(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    
    // Skip auth check if testing flag is enabled
    if (!DISABLE_AUTH_FOR_TESTING) {
      // Original auth check would go here
      // if (!isAuthenticated()) {
      //   alert('Please log in to comment on posts');
      //   return;
      // }
    }

    if (!newComment.trim() || isSubmittingComment) return;

    try {
      setIsSubmittingComment(true);
      
      if (DISABLE_AUTH_FOR_TESTING) {
        // Simulate successful comment addition for testing
        const newCommentObj = {
          id: Date.now(),
          content: newComment.trim(),
          user: { name: 'Test User' },
          createdAt: new Date().toISOString()
        };
        
        setComments(prev => [...prev, newCommentObj]);
        setCommentCount(prev => prev + 1);
        setNewComment('');
        
        if (onPostUpdate) {
          onPostUpdate(post.id, { comments: commentCount + 1 });
        }
      } else {
        // Original API call
        const response = await addComment(post.id, newComment.trim());
        if (response.success) {
          setCommentCount(prev => prev + 1);
          setNewComment('');
          
          if (onPostUpdate) {
            onPostUpdate(post.id, { comments: commentCount + 1 });
          }
        }
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      if (!DISABLE_AUTH_FOR_TESTING) {
        alert(error.message || 'Failed to add comment');
      }
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (!isOpen || !post) return null;

  return (
    <div className="post-modal-overlay" onClick={onClose}>
      <div className="post-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="post-modal-close" onClick={onClose}>
          ✕
        </button>
        
        <div className="post-modal-body">
          {/* Post Header */}
          <div className="post-header">
            <div className="user-avatar">
              {post.user ? post.user[0].toUpperCase() : "?"}
            </div>
            <div className="user-info">
              <div className="user-name">{post.user}</div>
              <div className="post-time">{post.time || "Just now"}</div>
            </div>
          </div>

          {/* Post Image */}
          <div className="post-image-container">
            {post.type === "video" ? (
              <video
                src={post.image}
                controls
                className="post-image"
              />
            ) : (
              <img
                src={post.image}
                alt="cat"
                className="post-image"
              />
            )}
          </div>

          {/* Post Caption */}
          <div className="post-caption">
            <span>{post.caption}</span>
          </div>

          {/* Like and Comment Buttons */}
          <div className="post-actions">
            <button
              onClick={handleLike}
              disabled={isTogglingLike}
              className={`action-btn like-btn ${
                isLiked ? 'liked' : ''
              } ${isTogglingLike ? 'disabled' : ''}`}
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
                <path 
                  d="M3.172 10.828a4 4 0 0 1 0-5.656c1.562-1.562 4.095-1.562 5.657 0L10 6.343l1.172-1.171c1.562-1.562 4.095-1.562 5.657 0a4 4 0 0 1 0 5.656l-6.364 6.364a1 1 0 0 1-1.414 0l-6.364-6.364z" 
                  fill={isLiked ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth={isLiked ? "0" : "1.5"}
                />
              </svg>
              {likeCount > 0 ? `${likeCount} Like${likeCount !== 1 ? 's' : ''}` : 'Like'}
            </button>
            
            <div className="comment-count">
              <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
                <path d="M18 10c0 3.866-3.582 7-8 7a8.96 8.96 0 0 1-3.39-.62l-3.11.89a1 1 0 0 1-1.26-1.26l.89-3.11A8.96 8.96 0 0 1 3 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" fill="currentColor"/>
              </svg>
              {commentCount > 0 ? `${commentCount} Comment${commentCount !== 1 ? 's' : ''}` : 'No comments'}
            </div>
          </div>

          {/* Comments Section */}
          <div className="comments-section">
            <div className="comments-list">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <div key={comment.id} className="comment-item">
                    <div className="comment-avatar">
                      {comment.user?.name ? comment.user.name[0].toUpperCase() : "?"}
                    </div>
                    <div className="comment-content">
                      <div className="comment-author">{comment.user?.name || 'Anonymous'}</div>
                      <div className="comment-text">{comment.content}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-comments">
                  No comments yet. Be the first to comment!
                </div>
              )}
            </div>

            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="comment-form">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="comment-input"
                disabled={isSubmittingComment}
              />
              <button
                type="submit"
                disabled={!newComment.trim() || isSubmittingComment}
                className="comment-submit"
              >
                {isSubmittingComment ? 'Posting...' : 'Post'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}