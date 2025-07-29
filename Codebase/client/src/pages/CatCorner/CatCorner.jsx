import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar/Navbar.jsx';
import Sidebar from "./view/Sidebar/Sidebar.jsx";
import FeedCard from '../../components/CatComponents/FeedCard/FeedCard';
import CatProfiles from './view/CatProfiles/CatProfiles.jsx';
import CatBreak from './view/CatBreak/CatBreak.jsx';
import CatFacts from './view/CatFacts/CatFacts.jsx';
import CatQA from './view/CatQA/CatQA.jsx';
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
    <div className="catcorner-page">
      <Navbar />
      <div className="catcorner fade-in">
        {/* ✅ Sidebar already styled with CSS — no wrapper or inline styles needed */}
        <Sidebar selectedView={view} setSelectedView={setView} />

        <main className="catcorner-main">
          <h1 className="catcorner-header">{renderHeader()}</h1>

          <div className="catcorner-content">
            {view === 'Posts' && (
              <>
                {/* Add Post Button - Compact */}
                <div className="add-post-section">
                  <button 
                    className="add-post-btn-compact"
                    onClick={() => setShowAddPost(!showAddPost)}
                    disabled={isSubmitting}
                  >
                    <span className="add-post-icon">📸</span>
                    Share
                  </button>
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

                {/* Posts Grid */}
                {!loading && (
                  <div className="feed-grid">
                    {posts.map((post) => (
                      <div className="feed-card" key={post.id}>
                        <FeedCard post={post} />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {view === 'Cat Profiles' && (
              <CatProfiles /> // ✅ New grid layout + softer animations are handled inside the component
            )}

            {view === 'Release your Stress' && <CatBreak />}
            {view === 'Random Cat Facts' && <CatFacts />}
            {/* {view === 'Cat Game' && <CatGame />} */}
            {view === 'Cat Help Desk' && <CatQA />}
          </div>
        </main>
      </div>
    </div>
  );
}
