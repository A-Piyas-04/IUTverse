import React, { useState, useRef, useEffect } from 'react';
import './PostModal.css';
import { toggleLike, addComment } from '../../../services/catPostApi';

export default function PostModal({ post, isOpen, onClose, onCommentSubmit }) {
  const [comment, setComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post?.likes || 0);
  const [comments, setComments] = useState(post?.comments || []);
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

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
  };

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
                <img src={post.image} alt="cat" />
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
