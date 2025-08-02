import React, { useState } from "react";
import "./CatProfileCard.css";

export default function CatProfileCard({ name, desc, img }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stories, setStories] = useState([]);
  const [newStory, setNewStory] = useState("");
  const [showStoryForm, setShowStoryForm] = useState(false);

  const handleCardClick = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setShowStoryForm(false);
    setNewStory("");
  };

  const handleAddStory = () => {
    if (newStory.trim()) {
      const story = {
        id: Date.now(),
        text: newStory,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString()
      };
      setStories([story, ...stories]);
      setNewStory("");
      setShowStoryForm(false);
    }
  };

  const handleSubmitStory = (e) => {
    e.preventDefault();
    handleAddStory();
  };

  // Generate random background color for header
  const getRandomHeaderColor = () => {
    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
      'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
      'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
      'linear-gradient(135deg, #fad0c4 0%, #ffd1ff 100%)'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  return (
    <>
      <div className="cat-card" onClick={handleCardClick}>
        <div className="cat-img-wrap">
          <img 
        src={img} 
        alt={name} 
        className="cat-img" 
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjZjNmM2YzIi8+Cjx0ZXh0IHg9IjUwIiB5PSI1NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIj7wn5CRIC48L3RleHQ+Cjwvc3ZnPg==';
        }}
      />
        </div>
        <div className="cat-info">
          <h3 className="cat-name">{name}</h3>
          <p className="cat-desc">{desc}</p>
        </div>
      </div>

      {/* Cat Profile Modal */}
      {isModalOpen && (
        <div className="cat-modal-overlay" onClick={handleCloseModal}>
          <div className="cat-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div 
              className="cat-modal-header"
              style={{ background: getRandomHeaderColor() }}
            >
              <h2 className="cat-modal-title">
                <span className="cat-modal-icon">🐱</span>
                {name}'s Profile
              </h2>
              <button className="cat-modal-close-btn" onClick={handleCloseModal}>
                <span className="close-icon">✕</span>
              </button>
            </div>

            {/* Content */}
            <div className="cat-modal-content">
              {/* Cat Image Section */}
              <div className="cat-modal-image-section">
                <div className="cat-modal-image-wrap">
                  <img 
          src={img} 
          alt={name} 
          className="cat-modal-image" 
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjZjNmM2YzIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMTU1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiPvCfkKEgQ2F0PC90ZXh0Pgo8L3N2Zz4=';
          }}
        />
                </div>
                <div className="cat-modal-info">
                  <h3 className="cat-modal-name">{name}</h3>
                  <p className="cat-modal-desc">{desc}</p>
                </div>
              </div>

              {/* Stories Section */}
              <div className="cat-stories-section">
                <div className="stories-header">
                  <h3 className="stories-title">
                    <span className="stories-icon">📖</span>
                    Stories & Memories
                  </h3>
                  <button 
                    className="add-story-btn"
                    onClick={() => setShowStoryForm(!showStoryForm)}
                  >
                    <span className="add-story-icon">✏️</span>
                    Add Story
                  </button>
                </div>

                {/* Story Form */}
                {showStoryForm && (
                  <div className="story-form-container">
                    <form onSubmit={handleSubmitStory} className="story-form">
                      <textarea
                        className="story-textarea"
                        placeholder="Share your story or memory with this cat..."
                        value={newStory}
                        onChange={(e) => setNewStory(e.target.value)}
                        rows="4"
                        maxLength="500"
                      />
                      <div className="story-form-actions">
                        <span className="story-char-count">
                          {newStory.length}/500
                        </span>
                        <div className="story-form-buttons">
                          <button 
                            type="button" 
                            className="cancel-story-btn"
                            onClick={() => {
                              setShowStoryForm(false);
                              setNewStory("");
                            }}
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit" 
                            className="submit-story-btn"
                            disabled={!newStory.trim()}
                          >
                            Share Story
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                )}

                {/* Stories List */}
                <div className="stories-list">
                  {stories.length === 0 ? (
                    <div className="no-stories">
                      <span className="no-stories-icon">📝</span>
                      <p className="no-stories-text">No stories yet. Be the first to share a memory with {name}!</p>
                    </div>
                  ) : (
                    stories.map((story) => (
                      <div key={story.id} className="story-item">
                        <div className="story-content">
                          <p className="story-text">{story.text}</p>
                          <div className="story-meta">
                            <span className="story-date">{story.date}</span>
                            <span className="story-time">{story.time}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
