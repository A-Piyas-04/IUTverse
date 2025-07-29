import React, { useState } from 'react';
import './PlayerTime.css';
import iutMosque from './iutMosque.jpg';

export default function PlayerTime({ isOpen, onClose }) {
  if (!isOpen) return null;

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

  const getCurrentPrayer = () => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const prayerTimesMinutes = prayerTimes.map(prayer => {
      const [hours, minutes] = prayer.time.split(':');
      const isPM = prayer.time.includes('PM');
      let hour = parseInt(hours);
      if (isPM && hour !== 12) hour += 12;
      if (!isPM && hour === 12) hour = 0;
      return {
        ...prayer,
        minutes: hour * 60 + parseInt(minutes)
      };
    });

    // Find the next prayer
    for (let prayer of prayerTimesMinutes) {
      if (prayer.minutes > currentTime) {
        return prayer;
      }
    }
    
    // If no next prayer today, return Fajr (first prayer of next day)
    return prayerTimesMinutes[0];
  };

  const currentPrayer = getCurrentPrayer();

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

        {/* Current Prayer Highlight */}
        <div className="current-prayer-section">
          <div className="current-prayer-card">
            <div className="current-prayer-icon">{currentPrayer.icon}</div>
            <div className="current-prayer-info">
              <h3 className="current-prayer-name">{currentPrayer.name}</h3>
              <p className="current-prayer-arabic">{currentPrayer.arabic}</p>
              <p className="current-prayer-time">{currentPrayer.time}</p>
              <p className="current-prayer-desc">{currentPrayer.description}</p>
            </div>
          </div>
        </div>

        {/* All Prayer Times */}
        <div className="prayer-times-list">
          <h3 className="times-list-title">Complete Schedule</h3>
          <div className="prayer-times-grid">
            {prayerTimes.map((prayer, index) => (
              <div 
                key={index} 
                className={`prayer-time-card ${prayer.name === currentPrayer.name ? 'current' : ''}`}
              >
                <div className="prayer-time-icon">{prayer.icon}</div>
                <div className="prayer-time-details">
                  <h4 className="prayer-name">{prayer.name}</h4>
                  <p className="prayer-arabic">{prayer.arabic}</p>
                  <p className="prayer-time">{prayer.time}</p>
                </div>
                <div className="prayer-status">
                  {prayer.name === currentPrayer.name && (
                    <span className="current-indicator">Next</span>
                  )}
                </div>
              </div>
            ))}
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
