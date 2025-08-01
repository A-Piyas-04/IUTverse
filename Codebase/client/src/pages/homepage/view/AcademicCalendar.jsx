import React, { useState, useEffect } from 'react';
import './AcademicCalendar.css';

const AcademicCalendar = ({ isOpen, onClose }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // IUT Academic Calendar image URL
  const calendarImageUrl = 'https://www.iutoic-dhaka.edu/academics/academic_calendar';
  
  // Alternative approach: try to find the actual image URL from the page
  const fallbackImageUrl = 'https://www.iutoic-dhaka.edu/images/academic-calendar.jpg';
  
  useEffect(() => {
    if (isOpen) {
      setImageLoaded(false);
      setImageError(false);
      setIsLoading(true);
    }
  }, [isOpen]);

  const handleImageLoad = () => {
    setImageLoaded(true);
    setIsLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setIsLoading(false);
    setImageLoaded(false);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="academic-calendar-overlay" onClick={handleOverlayClick}>
      <div className="academic-calendar-modal">
        <div className="academic-calendar-header">
          <h2 className="academic-calendar-title">
            <span className="calendar-icon">📅</span>
            IUT Academic Calendar
          </h2>
          <button 
            className="academic-calendar-close-btn" 
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        
        <div className="academic-calendar-content">
          {isLoading && (
            <div className="calendar-loading">
              <div className="loading-spinner"></div>
              <p>Loading Academic Calendar...</p>
            </div>
          )}
          
          {imageError && (
            <div className="calendar-error">
              <div className="error-icon">⚠️</div>
              <h3>Unable to Load Calendar</h3>
              <p>The academic calendar image could not be loaded at this time.</p>
              <a 
                href={calendarImageUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="calendar-link-btn"
              >
                View on IUT Website
              </a>
            </div>
          )}
          
          <div className="calendar-image-container">
            {/* Try to load the calendar page as an iframe first */}
            <iframe
              src={calendarImageUrl}
              className={`calendar-iframe ${imageLoaded ? 'loaded' : ''}`}
              onLoad={handleImageLoad}
              onError={handleImageError}
              title="IUT Academic Calendar"
              sandbox="allow-same-origin allow-scripts"
            />
            
            {/* Fallback: Direct link to website */}
            {!imageLoaded && !isLoading && (
              <div className="calendar-fallback">
                <div className="fallback-content">
                  <div className="calendar-icon-large">📅</div>
                  <h3>Academic Calendar</h3>
                  <p>Click below to view the official IUT Academic Calendar</p>
                  <a 
                    href={calendarImageUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="calendar-link-btn primary"
                  >
                    Open Academic Calendar
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcademicCalendar;