import React from "react";
import "./EventCard.css";

export default function EventCard({ event, onToggleWishlist, className = "" }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getTypeConfig = (type) => {
    switch (type) {
      case 'General':
        return { 
          icon: '🎉', 
          color: '#10b981',
          bgColor: '#f0fdf4',
          borderColor: '#bbf7d0'
        };
      case 'Club':
        return { 
          icon: '🏛️', 
          color: '#3b82f6',
          bgColor: '#eff6ff',
          borderColor: '#bfdbfe'
        };
      case 'Sports':
        return { 
          icon: '⚽', 
          color: '#f59e0b',
          bgColor: '#fffbeb',
          borderColor: '#fed7aa'
        };
      default:
        return { 
          icon: '📅', 
          color: '#6b7280',
          bgColor: '#f9fafb',
          borderColor: '#d1d5db'
        };
    }
  };

  const typeConfig = getTypeConfig(event.type);

  const handleWishlistToggle = (e) => {
    e.stopPropagation();
    onToggleWishlist(event.id);
  };

  const handleShare = (e) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: event.title,
        text: event.description,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(`${event.title}\n${event.description}\nDate: ${formatDate(event.date)} at ${event.time}\nLocation: ${event.location}`);
      alert('Event details copied to clipboard!');
    }
  };

  const handleRegister = () => {
    // In a real app, this would open a registration modal or redirect to registration page
    alert(`Registration for "${event.title}" will be implemented soon!`);
  };

  const handleViewDetails = () => {
    // In a real app, this would open a detailed view modal or navigate to event details page
    alert(`Detailed view for "${event.title}" will be implemented soon!`);
  };

  return (
    <div className={`event-card ${className}`}>
      {/* Event Image */}
      <div className="event-image">
        <img src={event.image} alt={event.title} />
        <div className="event-overlay">
          <div className="event-actions">
            <button 
              className={`wishlist-btn ${event.isWishlisted ? 'wishlisted' : ''}`}
              onClick={handleWishlistToggle}
              title={event.isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <span className="wishlist-icon">
                {event.isWishlisted ? '❤️' : '🤍'}
              </span>
            </button>
            <button 
              className="share-btn"
              onClick={handleShare}
              title="Share event"
            >
              <span className="share-icon">📤</span>
            </button>
          </div>
        </div>
      </div>

      {/* Event Content */}
      <div className="event-content">
        {/* Event Header */}
        <div className="event-header">
          <div className="event-type-badge" style={{
            backgroundColor: typeConfig.bgColor,
            color: typeConfig.color,
            borderColor: typeConfig.borderColor
          }}>
            <span className="type-icon">{typeConfig.icon}</span>
            <span className="type-label">{event.type}</span>
          </div>
          {event.clubName && (
            <div className="club-name">
              <span className="club-icon">🏛️</span>
              <span className="club-text">{event.clubName}</span>
            </div>
          )}
        </div>

        {/* Event Title */}
        <h3 className="event-title">{event.title}</h3>

        {/* Event Meta */}
        <div className="event-meta">
          <div className="meta-item">
            <span className="meta-icon">📅</span>
            <span className="meta-text">{formatDate(event.date)}</span>
          </div>
          <div className="meta-item">
            <span className="meta-icon">🕒</span>
            <span className="meta-text">{event.time}</span>
          </div>
          <div className="meta-item">
            <span className="meta-icon">📍</span>
            <span className="meta-text">{event.location}</span>
          </div>
          <div className="meta-item">
            <span className="meta-icon">🏷️</span>
            <span className="meta-text">{event.category}</span>
          </div>
        </div>

        {/* Event Description */}
        <p className="event-description">{event.description}</p>

        {/* Event Actions */}
        <div className="event-actions-bottom">
          <button className="register-btn" onClick={handleRegister}>
            <span className="register-icon">📝</span>
            Register Now
          </button>
          <button className="details-btn" onClick={handleViewDetails}>
            <span className="details-icon">ℹ️</span>
            View Details
          </button>
        </div>
      </div>
    </div>
  );
} 