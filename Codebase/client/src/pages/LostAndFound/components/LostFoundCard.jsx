import React, { useState } from "react";
import "./LostFoundCard.css";

export default function LostFoundCard({ post, onResolve, className = "" }) {
  const [showDetails, setShowDetails] = useState(false);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getImageUrl = (imagePath) => {
    if (!imagePath) {
      // Return placeholder image based on post type
      const color = post.type === 'lost' ? 'ef4444' : '10b981';
      return `https://placehold.co/400x300/${color}/ffffff?text=${encodeURIComponent(post.title)}`;
    }
    
    // If it's already a full URL, return as is
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // Otherwise, construct the full URL with the API base
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const baseUrl = API_BASE_URL.replace('/api', '');
    return `${baseUrl}${imagePath}`;
  };

  const getStatusColor = (status) => {
    return status === 'active' ? '#10b981' : '#6b7280';
  };

  const getTypeConfig = (type) => {
    return type === 'lost' 
      ? { 
          icon: '❌', 
          label: 'LOST', 
          color: '#ef4444',
          bgColor: '#fef2f2',
          borderColor: '#fecaca',
          gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
        }
      : { 
          icon: '✅', 
          label: 'FOUND', 
          color: '#10b981',
          bgColor: '#f0fdf4',
          borderColor: '#bbf7d0',
          gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
        };
  };

  const typeConfig = getTypeConfig(post.type);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post.title,
        text: post.description,
        url: window.location.href
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`${post.title}\n${post.description}\nContact: ${post.contact}`);
      alert('Post details copied to clipboard!');
    }
  };

  return (
    <div className={`lost-found-card ${post.status === 'resolved' ? 'resolved' : ''} ${className}`}>
      {/* Card Header */}
      <div className="card-header">
        <div className="type-badge" style={{ 
          background: typeConfig.gradient,
          color: 'white',
          borderColor: typeConfig.borderColor
        }}>
          <span className="type-icon">{typeConfig.icon}</span>
          <span className="type-label">{typeConfig.label}</span>
        </div>
        
        <div className="status-indicator" style={{ 
          backgroundColor: getStatusColor(post.status) 
        }}>
          {post.status === 'active' ? 'Active' : 'Resolved'}
        </div>
      </div>

      {/* Card Image */}
      <div className="card-image">
        <img 
          src={getImageUrl(post.image)} 
          alt={post.title}
          onError={(e) => {
            // Fallback to placeholder if image fails to load
            const color = post.type === 'lost' ? 'ef4444' : '10b981';
            e.target.src = `https://placehold.co/400x300/${color}/ffffff?text=${encodeURIComponent(post.title)}`;
          }}
        />
        <div className="image-overlay">
          <div className="image-actions">
            <button className="image-action-btn" onClick={handleShare}>
              <span className="action-icon">📤</span>
            </button>
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="card-content">
        <h3 className="card-title">{post.title}</h3>
        
        <div className="card-meta">
          <div className="meta-item">
            <span className="meta-icon">📍</span>
            <span className="meta-text">{post.location}</span>
          </div>
          <div className="meta-item">
            <span className="meta-icon">🕒</span>
            <span className="meta-text">{formatDate(post.createdAt)}</span>
          </div>
          <div className="meta-item">
            <span className="meta-icon">👤</span>
            <span className="meta-text">{post.user?.name || 'Anonymous'}</span>
          </div>
        </div>

        <p className="card-description">
          {showDetails ? post.description : `${post.description.substring(0, 120)}...`}
        </p>

        {post.description.length > 120 && (
          <button 
            className="read-more-btn"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Show Less' : 'Read More'}
          </button>
        )}

        {/* Contact Info */}
        <div className="contact-info">
          <span className="contact-label">Contact:</span>
          <span className="contact-email">{post.contact}</span>
        </div>
      </div>

      {/* Card Actions */}
      <div className="card-actions">
        {post.status === 'active' && (
          <button 
            className="resolve-btn"
            onClick={() => onResolve(post.id)}
          >
            <span className="resolve-icon">✓</span>
            Mark as Resolved
          </button>
        )}
        
        <button className="share-btn" onClick={handleShare}>
          <span className="share-icon">📤</span>
          Share
        </button>
      </div>
    </div>
  );
}