import React, { useState, useEffect } from 'react';
import './PlayerTime.css';
import iutMosque from './iutMosque.jpg';

export default function PlayerTime({ isOpen, onClose }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [nextPrayer, setNextPrayer] = useState(null);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Hardcoded prayer times (you can adjust these as needed)
  const prayerTimes = [
    {
      name: "Fajr",
      time: "5:30 AM",
      arabic: "الفجر",
      icon: "🌅",
      description: "Dawn Prayer"
    },
    {
      name: "Dhuhr",
      time: "1:15 PM", 
      arabic: "الظهر",
      icon: "☀️",
      description: "Noon Prayer"
    },
    {
      name: "Asr",
      time: "4:45 PM",
      arabic: "العصر", 
      icon: "🌤️",
      description: "Afternoon Prayer"
    },
    {
      name: "Maghrib",
      time: "6:30 PM",
      arabic: "المغرب",
      icon: "🌆",
      description: "Sunset Prayer"
    },
    {
      name: "Isha",
      time: "8:00 PM",
      arabic: "العشاء",
      icon: "🌙",
      description: "Night Prayer"
    }
  ];

  // Convert prayer time string to minutes since midnight
  const timeToMinutes = (timeStr) => {
    const [time, period] = timeStr.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    
    let totalMinutes = hours * 60 + minutes;
    
    if (period === 'PM' && hours !== 12) {
      totalMinutes += 12 * 60;
    } else if (period === 'AM' && hours === 12) {
      totalMinutes = minutes; // 12 AM = 0 hours
    }
    
    return totalMinutes;
  };

  // Get current prayer and next prayer
  const getCurrentAndNextPrayer = () => {
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    
    const prayerTimesWithMinutes = prayerTimes.map(prayer => ({
      ...prayer,
      minutes: timeToMinutes(prayer.time)
    }));

    // Find the next prayer
    let nextPrayer = null;
    let currentPrayer = null;

    for (let i = 0; i < prayerTimesWithMinutes.length; i++) {
      const prayer = prayerTimesWithMinutes[i];
      
      if (prayer.minutes > currentMinutes) {
        nextPrayer = prayer;
        // Current prayer is the one before this
        currentPrayer = i > 0 ? prayerTimesWithMinutes[i - 1] : prayerTimesWithMinutes[prayerTimesWithMinutes.length - 1];
        break;
      }
    }

    // If no next prayer found today, next prayer is Fajr tomorrow
    if (!nextPrayer) {
      nextPrayer = prayerTimesWithMinutes[0];
      currentPrayer = prayerTimesWithMinutes[prayerTimesWithMinutes.length - 1];
    }

    return { currentPrayer, nextPrayer };
  };

  // Calculate time until next prayer
  const getTimeUntilNextPrayer = (nextPrayer) => {
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    let timeUntil = nextPrayer.minutes - currentMinutes;
    
    // If next prayer is tomorrow
    if (timeUntil < 0) {
      timeUntil += 24 * 60; // Add 24 hours
    }
    
    const hours = Math.floor(timeUntil / 60);
    const minutes = timeUntil % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const { currentPrayer, nextPrayer: upcomingPrayer } = getCurrentAndNextPrayer();
  const timeUntilNext = getTimeUntilNextPrayer(upcomingPrayer);

  if (!isOpen) return null;

  return (
    <div className="prayer-times-overlay" onClick={onClose}>
      <div 
        className="prayer-times-modal" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="prayer-times-header">
          <div className="header-content">
            <div className="mosque-icon">🕌</div>
            <h2 className="prayer-title">Daily Prayer Times</h2>
            <p className="prayer-subtitle">IUT Mosque Schedule</p>
          </div>
          <button className="close-btn" onClick={onClose}>
            <span className="close-icon">✕</span>
          </button>
        </div>

        {/* Current Time Display */}
        <div className="current-time-section">
          <div className="current-time-display">
            <div className="time-icon">🕐</div>
            <div className="time-info">
              <h3 className="current-time-text">
                {currentTime.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </h3>
              <p className="current-date-text">
                {currentTime.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Next Prayer Highlight */}
        <div className="current-prayer-section">
          <div className="current-prayer-card">
            <div className="current-prayer-icon">{upcomingPrayer.icon}</div>
            <div className="current-prayer-info">
              <h3 className="current-prayer-name">{upcomingPrayer.name}</h3>
              <p className="current-prayer-arabic">{upcomingPrayer.arabic}</p>
              <p className="current-prayer-time">{upcomingPrayer.time}</p>
              <p className="current-prayer-desc">{upcomingPrayer.description}</p>
              <div className="time-until-next">
                <span className="time-until-label">Time until next prayer:</span>
                <span className="time-until-value">{timeUntilNext}</span>
              </div>
            </div>
          </div>
        </div>

        {/* All Prayer Times */}
        <div className="prayer-times-list">
          <h3 className="times-list-title">Complete Schedule</h3>
          <div className="prayer-times-grid">
            {prayerTimes.map((prayer, index) => {
              const prayerMinutes = timeToMinutes(prayer.time);
              const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
              const isNext = prayer.name === upcomingPrayer.name;
              const isPast = prayerMinutes < currentMinutes;
              
              return (
                <div 
                  key={index} 
                  className={`prayer-time-card ${isNext ? 'next' : ''} ${isPast ? 'past' : ''}`}
                >
                  <div className="prayer-time-icon">{prayer.icon}</div>
                  <div className="prayer-time-details">
                    <h4 className="prayer-name">{prayer.name}</h4>
                    <p className="prayer-arabic">{prayer.arabic}</p>
                    <p className="prayer-time">{prayer.time}</p>
                  </div>
                  <div className="prayer-status">
                    {isNext && (
                      <span className="next-indicator">Next</span>
                    )}
                    {isPast && (
                      <span className="past-indicator">Done</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="prayer-times-footer">
          <div className="footer-info">
            <p className="footer-text">🕌 IUT Central Mosque</p>
            <p className="footer-note">Times may vary slightly. Please check with the mosque for exact times.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
