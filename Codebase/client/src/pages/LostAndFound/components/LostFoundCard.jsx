import React, { useState } from "react";
import "./LostFoundCard.css";

export default function LostFoundCard({ post, onResolve }) {
  const [showDetails, setShowDetails] = useState(false);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
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
          borderColor: '#fecaca'
        }
      : { 
          icon: '✅', 
          label: 'FOUND', 
          color: '#10b981',
          bgColor: '#f0fdf4',
          borderColor: '#bbf7d0'
        };
  };

  const typeConfig = getTypeConfig(post.type);

  return (
    <div className={`lost-found-card ${post.status === 'resolved' ? 'resolved' : ''}`}>
      {/* Card Header */}
      <div className="card-header">
        <div className="type-badge" style={{ 
          backgroundColor: typeConfig.bgColor,
          color: typeConfig.color,
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
        <img src={post.image} alt={post.title} />
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
            <span className="meta-text">{formatDate(post.date)} at {post.time}</span>
          </div>
          <div className="meta-item">
            <span className="meta-icon">👤</span>
            <span className="meta-text">{post.user}</span>
          </div>
        </div>

        <p className="card-description">
          {showDetails ? post.description : `${post.description.substring(0, 100)}...`}
        </p>

        {post.description.length > 100 && (
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
        
        <button className="share-btn">
          <span className="share-icon">📤</span>
          Share
        </button>
      </div>
    </div>
  );
} 