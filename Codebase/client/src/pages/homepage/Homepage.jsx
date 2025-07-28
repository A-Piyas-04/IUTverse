import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar/Navbar.jsx";
import PostModal from "../../components/PostModal.jsx";
import { authUtils } from "../../utils/auth.js";
import { usePosts } from "../../hooks/usePosts.js";
import "./Homepage.css";

export default function HomePage() {
  
  const navigate = useNavigate();
  const { posts, loading, error, fetchAllPosts, createPost, toggleLike, clearError } = usePosts();

  const [userName] = useState("John Doe"); // Add default username
  const [selectedPost, setSelectedPost] = useState(null);
  const [newPostContent, setNewPostContent] = useState("");
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [showPostCreator, setShowPostCreator] = useState(false);
  
  // Fetch posts on component mount
  useEffect(() => {
    fetchAllPosts();
  }, [fetchAllPosts]);

  // Handle creating a new post
  const handleCreatePost = async () => {
    if (!newPostContent.trim() || isCreatingPost) return;
    
    setIsCreatingPost(true);
    const result = await createPost({
      content: newPostContent.trim(),
      category: "general",
      isAnonymous: false
    });
    
    if (result.success) {
      setNewPostContent("");
      setShowPostCreator(false);
    }
    setIsCreatingPost(false);
  };

  // Handle liking a post
  const handleLikePost = async (postId, event) => {
    event.stopPropagation(); // Prevent opening post modal
    await toggleLike(postId);
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 48) return "1 day ago";
    return `${Math.floor(diffInHours / 24)} days ago`;
  };

  // Handle adding comments to posts
  const handleAddComment = useCallback((postId, comment) => {
    console.log(`Adding comment to post ${postId}:`, comment);
    // This would normally update the post with the new comment
  }, []);

  // Handle logout
  const handleLogout = () => {
    // Clear authentication data
    authUtils.clearAuthData();
    
    // Navigate to login page
    navigate("/login");
  };
  
  return (
    <div className="homepage">
     <Navbar />

      {/* MAIN CONTENT AREA */}
      <main className="main-content animate-fade-in-up">
        {/* LEFT SIDEBAR */}
        <aside className="left-sidebar animate-fade-in-left">
          <h3 className="menu-title">Menu</h3>
          <ul className="menu-list">
            {[
              {
                label: (
                  <span
                    className="font-bold"
                    onClick={() => {
                      navigate("/profile");
                    }}
                  >
                    {userName}
                  </span>
                ),
                icon: (
                  <img
                    src="https://www.wondercide.com/cdn/shop/articles/Upside_down_gray_cat.png?v=1685551065&width=1500"
                    alt="Profile"
                    className="h-[30px] w-[30px] mr-[12px] rounded-full shadow-md border-2 border-green-400 hover:scale-105 transition-transform duration-200"
                  />
                ),
              },
              { label: "Friends", icon: "👥", bg: "bg-blue-200" },
              { label: "Saved", icon: "🔖", bg: "bg-pink-200" },
              { label: "Memories", icon: "⏰", bg: "bg-blue-100" },
              { label: "Groups", icon: "🧑‍🤝‍🧑", bg: "bg-blue-300" },
              { label: "Video", icon: "🎥", bg: "bg-blue-200" },
              { label: "Marketplace", icon: "🏪", bg: "bg-blue-100" },
              { label: "Feeds", icon: "📰", bg: "bg-blue-200" },
            ].map((item, i) => (
              <li
                key={i}
                className="menu-item"
              >
                {typeof item.icon === "string" ? (
                  <div
                    className={`menu-icon ${item.bg}`}
                  >
                    <span className="menu-icon-text">{item.icon}</span>
                  </div>
                ) : (
                  item.icon
                )}
                <span className="menu-label">
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </aside>

        {/* CENTER FEED */}
        <section className="center-feed">
          {/* Post box */}
          <div className="post-box">
            <div className="post-input-container">
              <img
                src="https://www.wondercide.com/cdn/shop/articles/Upside_down_gray_cat.png?v=1685551065&width=1500"
                alt="Profile"
                className="profile-img"
              />
              <input
                type="text"
                placeholder="What's on your mind?"
                className="post-input"
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreatePost()}
                disabled={isCreatingPost}
              />
              {newPostContent.trim() && (
                <button 
                  onClick={handleCreatePost}
                  disabled={isCreatingPost}
                  className="post-submit-btn"
                >
                  {isCreatingPost ? "Posting..." : "Post"}
                </button>
              )}
            </div>
            <div className="post-actions">
              <button className="action-btn live-video">
                📹 Live video
              </button>
              <button className="action-btn photo-video">
                🖼️ Photo/video
              </button>
              <button className="action-btn feeling">
                😊 Feeling/activity
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-message">
              <p>❌ Error: {error}</p>
              <button onClick={clearError} className="clear-error-btn">
                Dismiss
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="loading-message">
              <div className="loading-spinner"></div>
              <p>Loading posts...</p>
            </div>
          )}

          {/* Posts */}
          {!loading && posts.length === 0 && !error && (
            <div className="no-posts-message">
              <p>No posts yet. Be the first to share something!</p>
            </div>
          )}

          {posts.map((post, index) => (
            <div
              key={index}
              className="post"
              onClick={() => setSelectedPost(post)}
            >
              {/* Post Header */}
              <div className="post-header">
                <img
                  src="https://www.wondercide.com/cdn/shop/articles/Upside_down_gray_cat.png?v=1685551065&width=1500"
                  alt="Profile"
                  className="profile-img"
                />
                <div className="post-user-info">
                  <h4 className="post-username">
                    {post.user.name}
                  </h4>
                  <p className="post-meta">
                    {formatDate(post.createdAt)} • <span className="text-blue-500">🌐</span>
                  </p>
                </div>
                <button className="post-options-btn">
                  <span className="text-xl">⋯</span>
                </button>
              </div>

              {/* Post Content */}
              <div className="post-content">
                <div className="post-text">
                  {post.content}
                </div>
                {post.img && (
                  <img
                    src={post.img}
                    alt="Post"
                    className="post-image"
                  />
                )}
              </div>

              {/* Reactions and Comments Count */}
              <div className="post-stats">
                <div className="post-reactions">
                  <div className="reaction-icons">
                    <span className="text-blue-500">👍</span>
                    <span className="text-red-500">❤️</span>
                  </div>
                  <span>{post.likes}</span>
                </div>
                <div className="flex gap-4">
                  <span>0 shares</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="post-actions-buttons">
                <button 
                  className="post-action-btn"
                  onClick={(e) => handleLikePost(post.id, e)}
                >
                  <span>👍</span>
                  <span>Like</span>
                </button>
                <button className="flex items-center justify-center gap-2 py-2 px-4 mr-[5px] hover:bg-gray-100 rounded transition-colors text-gray-600 text-[15px] font-medium flex-1">
                  <span>💬</span>
                  <span>Comment</span>
                </button>
                <button className="flex items-center justify-center gap-2 py-2 px-4  hover:bg-gray-100 rounded transition-colors text-gray-600 text-[15px] font-medium flex-1">
                  <span>↗️</span>
                  <span>Share</span>
                </button>
              </div>
            </div>
          ))}
          {/* Post Detail Modal */}
          {selectedPost && (
            <PostModal
              post={posts.find((p) => p.id === selectedPost.id)}
              onClose={() => setSelectedPost(null)}
              onCommentSubmit={handleAddComment}
            />
          )}
        </section>

        {/* RIGHT SIDEBAR */}
        <aside className="right-sidebar animate-fade-in-right">
          <h3 className="contacts-title">Contacts</h3>
          <ul className="contacts-list">
            {[
              "Abu Zafar Sheikh Mohammad Golam Musabbereen Chishti",
              "Irfan Shafee",
              "Samiur Rahman Nafiz",
              "Faiyaz Awsaf",
              "Mashrur Faiyaz",
            ].map((name, i) => (
              <li
                key={i}
                className="contact-item"
              >
                <img
                  src="https://www.wondercide.com/cdn/shop/articles/Upside_down_gray_cat.png?v=1685551065&width=1500"
                  alt="User"
                  className="contact-img"
                />
                <span className="contact-name">
                  {name}
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </main>
      {/* Animations */}
      <style>{`
        @keyframes fade-in-down {
          0% { opacity: 0; transform: translateY(-30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-left {
          0% { opacity: 0; transform: translateX(-30px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes fade-in-right {
          0% { opacity: 0; transform: translateX(30px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        .animate-fade-in-down { animation: fade-in-down 0.7s cubic-bezier(.4,0,.2,1) both; }
        .animate-fade-in-up { animation: fade-in-up 0.7s cubic-bezier(.4,0,.2,1) both; }
        .animate-fade-in-left { animation: fade-in-left 0.7s cubic-bezier(.4,0,.2,1) both; }
        .animate-fade-in-right { animation: fade-in-right 0.7s cubic-bezier(.4,0,.2,1) both; }
      `}</style>
    </div>
  );
}
