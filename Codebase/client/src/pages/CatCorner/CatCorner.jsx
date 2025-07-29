import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar/Navbar.jsx';
import Sidebar from "./view/Sidebar/Sidebar.jsx";
import FeedCard from '../../components/CatComponents/FeedCard/FeedCard';
import CatProfiles from './view/CatProfiles/CatProfiles.jsx';
import CatBreak from './view/CatBreak/CatBreak.jsx';
import CatFacts from './view/CatFacts/CatFacts.jsx';
import CatQA from './view/CatQA/CatQA.jsx';
import PostModal from '../../components/CatComponents/PostModal/PostModal.jsx';
import { createCatPost, getCatPosts } from '../../services/catPostApi.js';
import './CatCorner.css';

const INITIAL_POSTS = [
  { id: 1, image: '/assets/cat1.jpg', caption: 'Lazy afternoon with my fluffy friend 😴', user: 'Alice', time: '2h ago', type: 'image' },
  { id: 2, image: '/assets/cat2.jpg', caption: 'Playful kitten discovered the yarn ball!', user: 'Bob', time: '4h ago', type: 'image' },
  { id: 3, image: '/assets/cat3.jpg', caption: 'Morning stretches are essential 🐱', user: 'Charlie', time: '6h ago', type: 'image' },
  { id: 4, image: '/assets/cat4.jpg', caption: 'Found the perfect sunny spot by the window', user: 'Diana', time: '8h ago', type: 'image' },
  { id: 5, image: '/assets/cat5.jpg', caption: 'Midnight zoomies session complete! 🏃‍♂️', user: 'Emma', time: '12h ago', type: 'image' },
  { id: 6, image: '/assets/cat6.jpg', caption: 'Professional box inspector at work', user: 'Frank', time: '1d ago', type: 'image' },
  { id: 7, image: '/assets/cat7.jpg', caption: 'Caught red-pawed stealing treats again', user: 'Grace', time: '1d ago', type: 'image' },
  { id: 8, image: '/assets/cat8.jpg', caption: 'Meditation master showing us how it\'s done', user: 'Henry', time: '2d ago', type: 'image' },
  { id: 9, image: '/assets/cat9.jpg', caption: 'When you realize it\'s Monday morning', user: 'Ivy', time: '2d ago', type: 'image' },
  { id: 10, image: '/assets/cat10.jpg', caption: 'Helping with homework as usual 📚', user: 'Jack', time: '3d ago', type: 'image' },
];

export default function CatCorner() {
  const [view, setView] = useState('Posts');
  const [posts, setPosts] = useState([]);
  const [showAddPost, setShowAddPost] = useState(false);
  const [newPost, setNewPost] = useState({ caption: '', image: null, imagePreview: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);


  // Fetch posts on component mount
  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getCatPosts(1, 20); // Get first 20 posts
      
      if (response.success) {
        // Transform backend data to match frontend format
        const transformedPosts = response.data.posts.map(post => ({
          id: post.id,
          image: post.image ? `http://localhost:3000${post.image}` : '/assets/default-cat.jpg',
          caption: post.caption,
          user: post.user?.name || 'Anonymous',
          time: formatTimeAgo(post.createdAt),
          type: 'image',
          likes: post.likes?.length || 0,
          comments: post.comments?.length || 0,
        }));
        setPosts(transformedPosts);
      } else {
        // If API fails, fall back to initial posts for demo
        setPosts(INITIAL_POSTS);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      setError('Failed to load posts. Showing demo content.');
      // Fall back to initial posts for demo
      setPosts(INITIAL_POSTS);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format time ago
  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInMinutes = Math.floor((now - postDate) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  // Handle post updates (likes, comments)
  const handlePostUpdate = (postId, updates) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { ...post, ...updates }
          : post
      )
    );
  };

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

  // Handle post click to open modal
  const handlePostClick = (post) => {
    setSelectedPost(post);
  };

  const handleAddPost = async () => {
    if (!newPost.caption.trim() || !newPost.image) {
      setError('Please provide both a caption and an image.');
      return;
    }



    try {
      setIsSubmitting(true);
      setError(null);
      
      const formData = new FormData();
      formData.append('caption', newPost.caption);
      formData.append('image', newPost.image);
      
      const response = await createCatPost(formData);
      
      if (response.success) {
        // Transform the new post to match frontend format
        const newPostData = {
          id: response.data.id,
          image: response.data.image ? `http://localhost:3000${response.data.image}` : '/assets/default-cat.jpg',
          caption: response.data.caption,
          user: response.data.user?.name || 'You',
          time: 'Just now',
          type: 'image',
          likes: 0,
          comments: 0,
        };
        
        // Add new post to the beginning of the list
        setPosts([newPostData, ...posts]);
        
        // Reset form
        setNewPost({ caption: '', image: null, imagePreview: '' });
        setShowAddPost(false);
      } else {
        setError(response.message || 'Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      setError(error.message || 'Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setNewPost(prev => ({
          ...prev,
          image: file,
          imagePreview: e.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const renderHeader = () => {
    switch (view) {
      case 'Posts': return '🐾 Cat Feed';
      case 'Cat Profiles': return '😺 Meet the Campus Cats';
      case 'Release your Stress': return '🧘‍♂️ Relax with Cats';
      case 'Random Cat Facts': return '📘 Random Cat Facts';
      // case 'Cat Game': return '🎮 Cat Game';
      case 'Cat Help Desk': return '❓ Cat Help Desk';
      default: return '';
    }
  };

  return (
    <div className="homepage">
      <Navbar />

      {/* MAIN CONTENT AREA */}
      <main className="main-content animate-fade-in-up">
        {/* LEFT SIDEBAR */}
        <aside className="left-sidebar animate-fade-in-left">
          <Sidebar selectedView={view} setSelectedView={setView} />
        </aside>

        {/* CENTER FEED */}
        <section className="center-feed">
          <h1 className="catcorner-header">{renderHeader()}</h1>
          
          {view === 'Posts' && (
            <>
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
                    placeholder="What's happening with your cat?"
                    className="post-input"
                    onClick={() => setShowAddPost(true)}
                    readOnly
                  />
                </div>
                <div className="post-actions">
                  <button className="action-btn live-video">
                    📹 Live video
                  </button>
                  <button className="action-btn photo-video" onClick={() => setShowAddPost(true)}>
                    🖼️ Photo/video
                  </button>
                  <button className="action-btn feeling">
                    😊 Feeling/activity
                  </button>
                </div>
              </div>

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

              {/* Add Post Form - Professional Popup */}
              {showAddPost && (
                <>
                  <div className="modal-overlay" onClick={() => setShowAddPost(false)}></div>
                  <div className="add-post-modal">
                    <div className="modal-header">
                      <h3>Share Cat Moment</h3>
                      <button 
                        className="modal-close-btn"
                        onClick={() => setShowAddPost(false)}
                      >
                        ✕
                      </button>
                    </div>
                    
                    <div className="modal-body">
                      <div className="upload-section">
                        {newPost.imagePreview ? (
                          <div className="image-preview-modal">
                            <img src={newPost.imagePreview} alt="Preview" />
                            <button 
                              className="remove-image-btn"
                              onClick={() => setNewPost(prev => ({ ...prev, image: null, imagePreview: '' }))}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <label className="upload-area">
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={handleImageUpload}
                              hidden
                            />
                            <div className="upload-content">
                              <span className="upload-icon">📷</span>
                              <span className="upload-text">Upload Photo</span>
                            </div>
                          </label>
                        )}
                      </div>
                      
                      <textarea
                        className="caption-textarea"
                        placeholder="What's happening with your cat?"
                        value={newPost.caption}
                        onChange={(e) => setNewPost(prev => ({ ...prev, caption: e.target.value }))}
                        rows={3}
                      />
                    </div>
                    
                    <div className="modal-footer">
                      <button 
                        className="btn-secondary"
                        onClick={() => setShowAddPost(false)}
                      >
                        Cancel
                      </button>
                      <button 
                        className="btn-primary"
                        onClick={handleAddPost}
                        disabled={!newPost.caption.trim() || !newPost.image || isSubmitting}
                      >
                        {isSubmitting ? 'Sharing...' : 'Share'}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Posts */}
              {!loading && posts.map((post) => (
                <div
                  key={post.id}
                  className="post"
                  onClick={() => handlePostClick(post)}
                  style={{ cursor: 'pointer' }}
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
                        {post.user}
                      </h4>
                      <p className="post-meta">
                        {post.time} • <span className="text-blue-500">🐱</span>
                      </p>
                    </div>
                    <button className="post-options-btn">
                      <span className="text-xl">⋯</span>
                    </button>
                  </div>

                  {/* Post Content */}
                  <div className="post-content">
                    <div className="post-text">
                      {post.caption}
                    </div>
                    {post.image && (
                      <img
                        src={post.image}
                        alt="Cat"
                        className="post-image"
                      />
                    )}
                  </div>

                  {/* Reactions and Comments Count */}
                  <div className="post-stats">
                    <div className="post-reactions">
                      <div className="reaction-icons">
                        <span className="text-red-500">❤️</span>
                      </div>
                      <span>{post.likes}</span>
                    </div>
                    <div className="flex gap-4">
                      <span>{post.comments} comments</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="post-actions-buttons">
                    <button className="post-action-btn">
                      <span>❤️</span>
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
            </>
          )}

          {view === 'Cat Profiles' && <CatProfiles />}
          {view === 'Release your Stress' && <CatBreak />}
          {view === 'Random Cat Facts' && <CatFacts />}
          {view === 'Cat Help Desk' && <CatQA />}
        </section>

        {/* RIGHT SIDEBAR */}
        <aside className="right-sidebar animate-fade-in-right">
          <h3 className="contacts-title">Cat Friends</h3>
          <ul className="contacts-list">
            {[
              "Whiskers the Explorer",
              "Luna the Sleepy",
              "Shadow the Mysterious",
              "Mittens the Playful",
              "Ginger the Adventurer",
            ].map((name, i) => (
              <li
                key={i}
                className="contact-item"
              >
                <img
                  src="https://www.wondercide.com/cdn/shop/articles/Upside_down_gray_cat.png?v=1685551065&width=1500"
                  alt="Cat"
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

      {/* Post Modal */}
      {selectedPost && (
        <PostModal
          post={selectedPost}
          isOpen={!!selectedPost}
          onClose={() => setSelectedPost(null)}
          onCommentSubmit={handleCommentSubmit}
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
