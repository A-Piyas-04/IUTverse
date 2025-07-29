import React, { useState } from 'react';
import Navbar from '../../components/Navbar/Navbar.jsx';
import Sidebar from "./view/Sidebar/Sidebar.jsx";
import FeedCard from '../../components/CatComponents/FeedCard/FeedCard';
import CatProfiles from './view/CatProfiles/CatProfiles.jsx';
import CatBreak from './view/CatBreak/CatBreak.jsx';
import CatFacts from './view/CatFacts/CatFacts.jsx';
import CatQA from './view/CatQA/CatQA.jsx';
// import CatGame from './view/CatGame/CatGame.jsx';
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
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [showAddPost, setShowAddPost] = useState(false);
  const [newPost, setNewPost] = useState({ caption: '', image: null, imagePreview: '' });

  const handleAddPost = () => {
    if (newPost.caption.trim() && newPost.image) {
      const post = {
        id: Date.now(),
        caption: newPost.caption,
        image: newPost.imagePreview,
        user: 'Current User', // In real app, get from auth context
        time: 'Just now',
        type: 'image'
      };
      setPosts([post, ...posts]);
      setNewPost({ caption: '', image: null, imagePreview: '' });
      setShowAddPost(false);
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
                  >
                    <span className="add-post-icon">📸</span>
                    Share
                  </button>
                </div>

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
                          disabled={!newPost.caption.trim() || !newPost.image}
                        >
                          Share
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Posts Grid */}
                <div className="feed-grid">
                  {posts.map((post) => (
                    <div className="feed-card" key={post.id}>
                      <FeedCard post={post} />
                    </div>
                  ))}
                </div>
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
