import React, { useState } from "react";
import { toggleLike, addComment, isAuthenticated } from '../../../services/catPostApi';
import PostModal from '../PostModal/PostModal';

export default function FeedCard({ post, onPostUpdate }) {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes || 0);
  const [commentCount, setCommentCount] = useState(post.commentsCount || post.comments?.length || 0);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isTogglingLike, setIsTogglingLike] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Temporary flag to disable auth checks - can be easily toggled later
  const DISABLE_AUTH_FOR_TESTING = true;

  // Format date function similar to homepage
  const formatDate = (dateString) => {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return '1d ago';
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  // Get profile picture function
  const getProfilePic = (user) => {
    return '/default_avatar.png'; // Default avatar for cat posts
  };

  const handleLike = async () => {
    // Skip auth check if testing flag is enabled
    if (!DISABLE_AUTH_FOR_TESTING && !isAuthenticated()) {
      alert('Please log in to like posts');
      return;
    }

    if (isTogglingLike) return;

    try {
      setIsTogglingLike(true);
      
      if (DISABLE_AUTH_FOR_TESTING) {
        // Simulate successful like toggle for testing
        setIsLiked(!isLiked);
        setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
        
        // Notify parent component of the update
        if (onPostUpdate) {
          onPostUpdate(post.id, { likes: isLiked ? likeCount - 1 : likeCount + 1 });
        }
      } else {
        // Original API call
        const response = await toggleLike(post.id);
        
        if (response.success) {
          setIsLiked(!isLiked);
          setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
          
          // Notify parent component of the update
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
    if (!DISABLE_AUTH_FOR_TESTING && !isAuthenticated()) {
      alert('Please log in to comment on posts');
      return;
    }

    if (!newComment.trim() || isSubmittingComment) return;

    try {
      setIsSubmittingComment(true);
      
      if (DISABLE_AUTH_FOR_TESTING) {
        // Simulate successful comment addition for testing
        setCommentCount(prev => prev + 1);
        setNewComment('');
        
        // Create new comment object
        const newCommentObj = {
          id: Date.now(),
          content: newComment.trim(),
          user: 'Current User',
          timestamp: new Date().toISOString()
        };
        
        // Notify parent component of the update
        if (onPostUpdate) {
          onPostUpdate(post.id, { 
            comments: [...(post.comments || []), newCommentObj],
            commentsCount: commentCount + 1
          });
        }
      } else {
        // Original API call
        const response = await addComment(post.id, newComment.trim());
        
        if (response.success) {
          setCommentCount(prev => prev + 1);
          setNewComment('');
          
          // Create new comment object from API response
          const newCommentObj = response.comment || {
            id: Date.now(),
            content: newComment.trim(),
            user: 'Current User',
            timestamp: new Date().toISOString()
          };
          
          // Notify parent component of the update
          if (onPostUpdate) {
            onPostUpdate(post.id, { 
              comments: [...(post.comments || []), newCommentObj],
              commentsCount: commentCount + 1
            });
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

  const handleCardClick = (e) => {
    // Don't open modal if clicking on buttons
    if (e.target.closest('button')) {
      return;
    }
    setShowModal(true);
  };

  return (
    <>
      <div 
        className="post"
        onClick={handleCardClick}
      >
        {/* Post Header */}
        <div className="post-header">
          <img
            src={getProfilePic(post.user)}
            alt="Profile"
            className="profile-img mt-[30px]"
          />
          <div className="post-user-info">
            <h4 className="post-username">
              {post.user || "Anonymous"}
            </h4>
            <p className="post-meta">
              {formatDate(post.createdAt || post.time)} •{" "}
              <span className="text-green-500">🐱</span>
            </p>
          </div>
          <button className="post-options-btn">
            <span className="text-xl">⋯</span>
          </button>
        </div>

        {/* Post Content */}
        <div className="post-content">
          <div className="post-text">{post.caption}</div>
          {post.image && (
            post.type === "video" ? (
              <video
                src={post.image}
                controls
                className="post-image"
                style={{ background: "#f3f3f3" }}
              />
            ) : (
              <img
                src={post.image}
                alt="Cat post"
                className="post-image"
                loading="lazy"
              />
            )
          )}
        </div>

        {/* Reactions and Comments Count */}
        <div className="post-stats">
          <div className="post-reactions">
            <div className="reaction-icons">
              <span className="text-green-500">👍</span>
              <span className="text-red-500">❤️</span>
            </div>
            <span>{likeCount || 0}</span>
          </div>
          <div className="flex gap-4">
            <span>{commentCount || 0} comments</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="post-actions-buttons">
          <button
            className="post-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleLike();
            }}
            disabled={isTogglingLike}
          >
            <span>👍</span>
            <span>Like</span>
          </button>
          <button 
            className="flex items-center justify-center gap-2 py-2 px-4 mr-[5px] hover:bg-gray-100 rounded transition-colors text-gray-600 text-[15px] font-medium flex-1"
            onClick={(e) => {
              e.stopPropagation();
              setShowModal(true);
            }}
          >
            <span>💬</span>
            <span>Comment</span>
          </button>
        </div>
      </div>

      {/* PostModal for zoom view */}
      {showModal && (
        <PostModal
          post={post}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onPostUpdate={onPostUpdate}
          onCommentSubmit={(postId, newComment) => {
            // Update local comment count
            setCommentCount(prev => prev + 1);
            // Notify parent component with proper data structure
            if (onPostUpdate) {
              onPostUpdate(postId, { 
                comments: [...(post.comments || []), newComment],
                commentsCount: commentCount + 1
              });
            }
          }}
        />
      )}
    </>
  );
}
