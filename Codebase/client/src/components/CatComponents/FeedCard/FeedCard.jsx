import React, { useState, useEffect } from "react";
import { toggleLike, addComment, isAuthenticated } from '../../../services/catPostApi';
import { authUtils } from '../../../utils/auth';
import PostModal from '../PostModal/PostModal';

export default function FeedCard({ post, onPostUpdate, refreshPosts }) {
  // Get current user ID to check if user has liked the post
  const getCurrentUserId = () => {
    const userData = authUtils.getUserData();
    return userData?.id;
  };

  const currentUserId = getCurrentUserId();
  
  // Check if current user has liked this post
  const userHasLiked = post.likes?.some(like => like.userId === currentUserId) || false;
  
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likesCount || post.likes?.length || 0);
  const [commentCount, setCommentCount] = useState(post.commentsCount || post.comments?.length || 0);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isTogglingLike, setIsTogglingLike] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Temporary flag to disable auth checks - can be easily toggled later
  const DISABLE_AUTH_FOR_TESTING = true;

  // Update like state when post changes
  useEffect(() => {
    const currentUserId = getCurrentUserId();
    const userHasLiked = post.likes?.some(like => like.userId === currentUserId) || false;
    setIsLiked(userHasLiked);
    setLikeCount(post.likesCount || post.likes?.length || 0);
    setCommentCount(post.commentsCount || post.comments?.length || 0);
  }, [post]);

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
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNmM2YzZjMiLz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSI4IiB5PSI4Ij4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDMTMuMSAyIDE0IDIuOSAxNCA0QzE0IDUuMSAxMy4xIDYgMTIgNkMxMC45IDYgMTAgNS4xIDEwIDRDMTAgMi45IDEwLjkgMiAxMiAyWk0yMSAxOVYyMEgzVjE5TDUgMTdWMTFIMTlWMTdMMjEgMTlaIiBmaWxsPSIjOTk5Ii8+Cjwvc3ZnPgo8L3N2Zz4KPC9zdmc+';
            }}
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
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjZjNmM2YzIi8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiPkltYWdlIG5vdCBhdmFpbGFibGU8L3RleHQ+Cjwvc3ZnPg==';
                }}
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
