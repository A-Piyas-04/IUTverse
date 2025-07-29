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
        className="feed-card transition-shadow duration-200 hover:shadow-lg relative cursor-pointer"
        onClick={handleCardClick}
      >
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
            onClick={handleLike}
            disabled={isTogglingLike}
            className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded transition-colors duration-150 ${
              isLiked 
                ? 'text-red-600 hover:text-red-800' 
                : 'text-green-600 hover:text-green-800'
            } ${isTogglingLike ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isLiked ? 'Unlike' : 'Like'}
            style={{ background: isLiked ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.07)" }}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 20 20">
              <path 
                d="M3.172 10.828a4 4 0 0 1 0-5.656c1.562-1.562 4.095-1.562 5.657 0L10 6.343l1.172-1.171c1.562-1.562 4.095-1.562 5.657 0a4 4 0 0 1 0 5.656l-6.364 6.364a1 1 0 0 1-1.414 0l-6.364-6.364z" 
                fill={isLiked ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth={isLiked ? "0" : "1.5"}
              />
            </svg>
            {likeCount > 0 ? `${likeCount} Like${likeCount !== 1 ? 's' : ''}` : 'Like'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowModal(true);
            }}
            className="flex items-center gap-1 text-gray-500 hover:text-green-700 text-xs font-medium px-2 py-1 rounded transition-colors duration-150"
            title="Comment"
            style={{ background: "rgba(16,185,129,0.05)" }}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 20 20">
              <path d="M18 10c0 3.866-3.582 7-8 7a8.96 8.96 0 0 1-3.39-.62l-3.11.89a1 1 0 0 1-1.26-1.26l.89-3.11A8.96 8.96 0 0 1 3 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" fill="currentColor"/>
            </svg>
            {commentCount > 0 ? `${commentCount} Comment${commentCount !== 1 ? 's' : ''}` : 'Comment'}
          </button>
        </div>
        <span className="text-xs text-gray-400">{post.time || "Just now"}</span>
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
