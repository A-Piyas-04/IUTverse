import React, { useState, useEffect } from "react";
import "./CatBreak.css";

// Fallback videos in case API fails - Extended collection with reliable thumbnails
const FALLBACK_VIDEOS = [
  {
    id: "J---aiyznGQ",
    title: "Funny Cats Compilation",
    thumbnail: `https://img.youtube.com/vi/J---aiyznGQ/hqdefault.jpg`
  },
  {
    id: "5dsGWM5XGdg",
    title: "Cat Relaxing Music 🐱",
    thumbnail: `https://img.youtube.com/vi/5dsGWM5XGdg/hqdefault.jpg`
  },
  {
    id: "z3U0udLH974",
    title: "Cute Kittens Doing Funny Things",
    thumbnail: `https://img.youtube.com/vi/z3U0udLH974/hqdefault.jpg`
  },
  {
    id: "hFZFjoX2cGg",
    title: "Relaxing Cat Videos for Stress Relief",
    thumbnail: `https://img.youtube.com/vi/hFZFjoX2cGg/hqdefault.jpg`
  },
  {
    id: "m_MaJDK3VNE",
    title: "Peaceful Cat Moments",
    thumbnail: `https://img.youtube.com/vi/m_MaJDK3VNE/hqdefault.jpg`
  },
  {
    id: "lXKDu6cdXLI",
    title: "Sleepy Cats Compilation",
    thumbnail: `https://img.youtube.com/vi/lXKDu6cdXLI/hqdefault.jpg`
  },
  {
    id: "tpiyEe_CqB4",
    title: "Cats Being Cats - Funny Moments",
    thumbnail: `https://img.youtube.com/vi/tpiyEe_CqB4/hqdefault.jpg`
  },
  {
    id: "CJktnFJJ954",
    title: "Relaxing Cat Purring Sounds",
    thumbnail: `https://img.youtube.com/vi/CJktnFJJ954/hqdefault.jpg`
  },
  {
    id: "w7x_lWJNnNg",
    title: "Kitten Therapy - Stress Relief",
    thumbnail: `https://img.youtube.com/vi/w7x_lWJNnNg/hqdefault.jpg`
  },
  {
    id: "rNSnfXl1ZjU",
    title: "Cats Playing and Having Fun",
    thumbnail: `https://img.youtube.com/vi/rNSnfXl1ZjU/hqdefault.jpg`
  },
  {
    id: "HBxn56l9WcU",
    title: "Zen Cat Meditation",
    thumbnail: `https://img.youtube.com/vi/HBxn56l9WcU/hqdefault.jpg`
  },
  {
    id: "QIobikJiTuU",
    title: "Adorable Cat Moments",
    thumbnail: `https://img.youtube.com/vi/QIobikJiTuU/hqdefault.jpg`
  },
  {
    id: "sJeuWZNWImE",
    title: "Cats vs Cucumbers - Funny Reactions",
    thumbnail: `https://img.youtube.com/vi/sJeuWZNWImE/hqdefault.jpg`
  },
  {
    id: "YbQ_kj9HZ5k",
    title: "Therapeutic Cat Videos",
    thumbnail: `https://img.youtube.com/vi/YbQ_kj9HZ5k/hqdefault.jpg`
  },
  {
    id: "O2BkqFkTNQs",
    title: "Cats Being Derps",
    thumbnail: `https://img.youtube.com/vi/O2BkqFkTNQs/hqdefault.jpg`
  },
  {
    id: "xdhLQCYQ-nQ",
    title: "Calming Cat Sounds for Relaxation",
    thumbnail: `https://img.youtube.com/vi/xdhLQCYQ-nQ/hqdefault.jpg`
  }
];

// Cat-related search terms for variety
const CAT_SEARCH_TERMS = [
  'relaxing cats',
  'cute kittens',
  'funny cats compilation',
  'cat meditation',
  'sleepy cats',
  'cat therapy'
];

export default function CatBreak() {
  const [videos, setVideos] = useState(FALLBACK_VIDEOS);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [imageErrors, setImageErrors] = useState({});

  // Simulate API call to fetch cat videos
  const fetchCatVideos = async () => {
    try {
      setLoading(true);
      
      // In a real implementation, you would call a YouTube API or similar
      // For now, we'll simulate an API call and randomize the fallback videos
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Shuffle and select random videos (at least 12)
      const shuffled = [...FALLBACK_VIDEOS].sort(() => 0.5 - Math.random());
      const selectedVideos = shuffled.slice(0, 12);
      
      setVideos(selectedVideos);
    } catch (error) {
      console.error('Failed to fetch cat videos:', error);
      setVideos(FALLBACK_VIDEOS);
    } finally {
      setLoading(false);
    }
  };

  const refreshVideos = async () => {
    setRefreshing(true);
    setImageErrors({}); // Reset image errors on refresh
    await fetchCatVideos();
    setRefreshing(false);
  };

  const handleImageError = (videoId) => {
    setImageErrors(prev => ({ ...prev, [videoId]: true }));
  };

  const getImageSrc = (video) => {
    if (imageErrors[video.id]) {
      // Fallback to a different thumbnail quality or a placeholder
      return `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`;
    }
    return video.thumbnail;
  };

  useEffect(() => {
    fetchCatVideos();
  }, []);

  return (
    <section className="cat-break-container">
      <div className="cat-break-header">
        <div>
          <h2 className="cat-break-heading">Take a Cat Break 🐾</h2>
          <p className="cat-break-subtext">
            Sit back, relax, and enjoy some cat therapy. 😸
          </p>
        </div>
        <button 
          className={`refresh-btn ${refreshing ? 'refreshing' : ''}`}
          onClick={refreshVideos}
          disabled={refreshing}
        >
          🔄 {refreshing ? 'Loading...' : 'New Videos'}
        </button>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Finding the most relaxing cat videos for you... 🐱</p>
        </div>
      ) : (
        <>
          <div className="cat-break-grid">
            {videos.map((video, index) => (
              <div key={`${video.id}-${index}`} className="cat-break-video-wrapper">
                <div className="video-thumbnail" onClick={() => setSelectedVideo(video)}>
                  <img 
                    src={getImageSrc(video)}
                    alt={video.title}
                    className="thumbnail-image"
                    onError={() => handleImageError(video.id)}
                    loading="lazy"
                  />
                  <div className="play-overlay">
                    <div className="play-button">▶️</div>
                  </div>
                </div>
                <p className="video-title">{video.title}</p>
              </div>
            ))}
          </div>

          {/* Video Modal */}
          {selectedVideo && (
            <div className="video-modal" onClick={() => setSelectedVideo(null)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button 
                  className="modal-close"
                  onClick={() => setSelectedVideo(null)}
                >
                  ✕
                </button>
                <iframe
                  className="modal-video"
                  src={`https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1`}
                  title={selectedVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                <h3 className="modal-title">{selectedVideo.title}</h3>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
