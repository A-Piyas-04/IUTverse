import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar.jsx';
import Sidebar from "./view/Sidebar/Sidebar.jsx";
import PostModal from '../../components/PostModal.jsx';
import CatProfiles from './view/CatProfiles/CatProfiles.jsx';
import CatBreak from './view/CatBreak/CatBreak.jsx';
import CatFacts from './view/CatFacts/CatFacts.jsx';
import CatQA from './view/CatQA/CatQA.jsx';

import { postService } from '../../services/postService';
import { authUtils } from '../../utils/auth.js';
import './CatCorner.css';

const INITIAL_POSTS = [
  { id: 1, image: '/assets/cat1.jpg', caption: 'Lazy afternoon with my fluffy friend 😴', user: 'Alice', time: '2h ago', type: 'image', comments: [], commentsCount: 0, likes: [], likesCount: 0 },
  { id: 2, image: '/assets/cat2.jpg', caption: 'Playful kitten discovered the yarn ball!', user: 'Bob', time: '4h ago', type: 'image', comments: [], commentsCount: 0, likes: [], likesCount: 0 },
  { id: 3, image: '/assets/cat3.jpg', caption: 'Morning stretches are essential 🐱', user: 'Charlie', time: '6h ago', type: 'image', comments: [], commentsCount: 0, likes: [], likesCount: 0 },
  { id: 4, image: '/assets/cat4.jpg', caption: 'Found the perfect sunny spot by the window', user: 'Diana', time: '8h ago', type: 'image', comments: [], commentsCount: 0, likes: [], likesCount: 0 },
  { id: 5, image: '/assets/cat5.jpg', caption: 'Midnight zoomies session complete! 🏃‍♂️', user: 'Emma', time: '12h ago', type: 'image', comments: [], commentsCount: 0, likes: [], likesCount: 0 },
  { id: 6, image: '/assets/cat6.jpg', caption: 'Professional box inspector at work', user: 'Frank', time: '1d ago', type: 'image', comments: [], commentsCount: 0, likes: [], likesCount: 0 },
  { id: 7, image: '/assets/cat7.jpg', caption: 'Caught red-pawed stealing treats again', user: 'Grace', time: '1d ago', type: 'image', comments: [], commentsCount: 0, likes: [], likesCount: 0 },
  { id: 8, image: '/assets/cat8.jpg', caption: 'Meditation master showing us how it\'s done', user: 'Henry', time: '2d ago', type: 'image', comments: [], commentsCount: 0, likes: [], likesCount: 0 },
  { id: 9, image: '/assets/cat9.jpg', caption: 'When you realize it\'s Monday morning', user: 'Ivy', time: '2d ago', type: 'image', comments: [], commentsCount: 0, likes: [], likesCount: 0 },
  { id: 10, image: '/assets/cat10.jpg', caption: 'Helping with homework as usual 📚', user: 'Jack', time: '3d ago', type: 'image', comments: [], commentsCount: 0, likes: [], likesCount: 0 },
];

export default function CatCorner() {
  const navigate = useNavigate();
  const [view, setView] = useState('Posts');
  const [posts, setPosts] = useState([]);
  const [user, setUser] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);



  // Fetch user data and posts on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = authUtils.getUserData();
        setUser(userData);
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      }
    };

    fetchUserData();
    fetchPosts();
  }, []);

  // Handle user logout (similar to homepage)
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Handle chat navigation (similar to homepage)
  const handleChatNavigation = (conversationId) => {
    if (conversationId) {
      navigate(`/chat?conversation=${conversationId}`);
    } else {
      navigate('/chat');
    }
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch only cat category posts
      const postsData = await postService.getPostsByCategory('cat', 1, 20);
      console.log('Cat posts data:', postsData);

      // Handle response - should already be filtered by category
      if (postsData && Array.isArray(postsData)) {
        setPosts(postsData);
      } else {
        console.error('Invalid posts data format:', postsData);
        setPosts([]);
      }
    } catch (error) {
      console.error('Error fetching cat posts:', error);
      setError('Failed to load cat posts.');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  // Format date function (same as homepage)
  const formatDate = (dateString) => {
    if (!dateString) return "Just now";

    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 60) {
        return diffMins <= 1 ? "just now" : `${diffMins} minutes ago`;
      } else if (diffHours < 24) {
        return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
      } else if (diffDays < 7) {
        return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      console.error("Date formatting error:", error);
      return "Invalid date";
    }
  };

  // Handle post updates (likes, comments)
  const handlePostUpdate = (postId, updates) => {
    setPosts(prevPosts =>
      prevPosts.map(post => {
        if (post.id === postId) {
          const updatedPost = { ...post, ...updates };
          
          // Handle like count updates - if 'likes' is a number, update likesCount
          if (typeof updates.likes === 'number') {
            updatedPost.likesCount = updates.likes;
            // Keep the likes array unchanged if it exists
            updatedPost.likes = post.likes || [];
          }
          
          return updatedPost;
        }
        return post;
      })
    );
  };

  // Refresh posts after interactions (similar to homepage)
  const refreshPosts = useCallback(async () => {
    try {
      // Fetch only cat category posts
      const postsData = await postService.getPostsByCategory('cat', 1, 20);
      console.log('Refreshed cat posts data:', postsData);

      // Handle response - should already be filtered by category
      if (postsData && Array.isArray(postsData)) {
        setPosts(postsData);
      } else {
        console.error('Invalid refreshed posts data format:', postsData);
        setPosts([]);
      }
    } catch (error) {
      console.error('Failed to refresh posts:', error);
    }
  }, []);

  // Handle comment submission
  const handleCommentSubmit = (postId, newComment) => {
    setPosts(prevPosts =>
      prevPosts.map(post =>
        post.id === postId
          ? {
            ...post,
            comments: [...(post.comments || []), newComment],
            commentsCount: (post.comments?.length || 0) + 1
          }
          : post
      )
    );
  };







  // Format date and time for posts
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) {
        return `${diffInDays}d ago`;
      } else {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
      }
    }
  };

  const renderHeader = () => {
    switch (view) {
      case 'Posts': return '🐾 Cat Feed';
      case 'Cat Profiles': return '😺 Meet The Cats';
      case 'Release your Stress': return '🧘‍♂️ Relax';
      case 'Random Cat Facts': return '📘 Cat Facts';
      // case 'Cat Game': return '🎮 Cat Game';
      case 'Cat Help Desk': return '❓ Cat Help Desk';
      default: return '';
    }
  };

  return (
    <div className="homepage">
      <Navbar />

      {/* Mobile Menu Button */}
      <button 
        className="mobile-menu-btn"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? '✕' : '🐾'}
      </button>



      {/* MAIN CONTENT AREA */}
      <main className="main-content animate-fade-in-up">
        {/* LEFT SIDEBAR */}
        <aside className={`left-sidebar animate-fade-in-left ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          <Sidebar 
            selectedView={view} 
            setSelectedView={setView} 
            onMenuClick={() => setIsMobileMenuOpen(false)}
          />
        </aside>

        {/* CENTER FEED */}
        <section className="center-feed">
          <h1 className="catcorner-header">{renderHeader()}</h1>

          {view === 'Posts' && (
            <>


              {error && (
                <div className="error-message">
                  {error}
                  <button
                    className="error-close"
                    onClick={() => setError(null)}
                  >
                    ×
                  </button>
                </div>
              )}

              {loading && (
                <div className="loading-message">
                  Loading posts...
                </div>
              )}



              {/* Posts */}
              {!loading && posts.map((post) => (
                <div key={post.id} className="post-card">
                  <div className="post-header">
                    <div className="user-info">
                      <img 
                        src={post.user?.profilePicture ? 
                          (post.user.profilePicture.startsWith('http') ? 
                            post.user.profilePicture : 
                            `http://localhost:3000${post.user.profilePicture}`
                          ) : '/assets/default-avatar.png'
                        } 
                        alt="User" 
                        className="user-avatar"
                        onError={(e) => {
                          e.target.src = '/assets/default-avatar.png';
                        }}
                      />
                      <div className="user-details">
                        <h4>{post.isAnonymous ? 'Anonymous' : (post.user?.name || 'Unknown User')}</h4>
                        <p className="post-time">{formatDateTime(post.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="post-content">
                    <p>{post.content}</p>
                    {post.image && (
                      <div className="post-image">
                        <img 
                          src={post.image.startsWith('http') ? post.image : `http://localhost:3000${post.image}`} 
                          alt="Post content" 
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    {post.video && (
                      <div className="post-video">
                        <video 
                          controls 
                          src={post.video.startsWith('http') ? post.video : `http://localhost:3000${post.video}`}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        >
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    )}
                  </div>
                  
                  <div className="post-stats">
                    <span>{post.reactions?.length || 0} reactions</span>
                    <span>{post.comments?.length || 0} comments</span>
                  </div>
                  
                  <div className="post-actions">
                    <button 
                       className={`action-btn like-btn ${post.reactions?.some(r => r.userId === user?.id) ? 'liked' : ''}`}
                       onClick={(e) => {
                         e.stopPropagation();
                         postService
                           .reactToPost(post.id, "LIKE")
                           .then(refreshPosts)
                           .catch((err) =>
                             console.error("Failed to like post:", err)
                           );
                       }}
                     >
                       <span>👍</span>
                       Like
                     </button>
                    <button 
                      className="action-btn comment-btn"
                      onClick={() => setSelectedPost(post)}
                    >
                      <i className="fas fa-comment"></i>
                      Comment
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {view === 'Cat Profiles' && <CatProfiles />}
          {view === 'Release your Stress' && <CatBreak />}
          {view === 'Random Cat Facts' && <CatFacts />}
          {view === 'Cat Help Desk' && <CatQA />}
        </section>

        {/* RIGHT SIDEBAR - Hidden on mobile */}
        <aside className="cat-gui-sidebar animate-fade-in-right desktop-only">
          <div className="gui-paw-container">
            <div className="paw-print"></div>
            <div className="paw-print small"></div>
            <div className="paw-print large"></div>
          </div>

          <div className="gui-shape blob1"></div>
          <div className="gui-shape blob2"></div>
          <div className="gui-cat-icon">🐾</div>
          <div className="gui-cat-icon bottom">😺</div>
        </aside>

      </main>

      {/* Post Modal for detailed view and comments */}
      {selectedPost && (
        <PostModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          refreshPosts={refreshPosts}
        />
      )}

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
