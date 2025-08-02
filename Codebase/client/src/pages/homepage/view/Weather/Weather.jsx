import React, { useState, useEffect } from 'react';
import './Weather.css';

const Weather = ({ isOpen, onClose }) => {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // OpenWeatherMap API configuration
  const API_KEY = '56aac83b6672317bef7f2a9a92d6e8c7'; // Updated API key
  const CITY = 'London,uk'; // Using London as example from the provided endpoint
  const API_URL = `https://api.openweathermap.org/data/2.5/weather?q=${CITY}&APPID=${API_KEY}&units=metric`;
  const FORECAST_URL = `https://api.openweathermap.org/data/2.5/forecast?q=${CITY}&APPID=${API_KEY}&units=metric`;

  const [forecastData, setForecastData] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchWeatherData();
    }
  }, [isOpen]);

  const fetchWeatherData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching weather data from:', API_URL);
      
      // Fetch current weather
      const weatherResponse = await fetch(API_URL);
      console.log('Weather response status:', weatherResponse.status);
      
      if (!weatherResponse.ok) {
        const errorText = await weatherResponse.text();
        console.error('Weather API error:', errorText);
        throw new Error(`Weather API error: ${weatherResponse.status} - ${errorText}`);
      }
      
      const weather = await weatherResponse.json();
      console.log('Weather data received:', weather);
      setWeatherData(weather);

      // Fetch 5-day forecast
      console.log('Fetching forecast data from:', FORECAST_URL);
      const forecastResponse = await fetch(FORECAST_URL);
      console.log('Forecast response status:', forecastResponse.status);
      
      if (!forecastResponse.ok) {
        const errorText = await forecastResponse.text();
        console.error('Forecast API error:', errorText);
        throw new Error(`Forecast API error: ${forecastResponse.status} - ${errorText}`);
      }
      
      const forecast = await forecastResponse.json();
      console.log('Forecast data received:', forecast);
      setForecastData(forecast);
      
      // Clear any previous errors on successful fetch
      setError(null);
      
    } catch (err) {
      console.error('Error fetching weather data:', err);
      setError(`Failed to fetch real-time weather data: ${err.message}`);
      
      // Don't set mock data - let the error state show
      setWeatherData(null);
      setForecastData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getWeatherIcon = (iconCode) => {
    const iconMap = {
      '01d': '☀️', '01n': '🌙',
      '02d': '⛅', '02n': '☁️',
      '03d': '☁️', '03n': '☁️',
      '04d': '☁️', '04n': '☁️',
      '09d': '🌧️', '09n': '🌧️',
      '10d': '🌦️', '10n': '🌧️',
      '11d': '⛈️', '11n': '⛈️',
      '13d': '❄️', '13n': '❄️',
      '50d': '🌫️', '50n': '🌫️'
    };
    return iconMap[iconCode] || '🌤️';
  };

  if (!isOpen) return null;

  return (
    <div className="weather-overlay" onClick={onClose}>
      <div className="weather-modal" onClick={(e) => e.stopPropagation()}>
        <div className="weather-header">
          <h2 className="weather-title">
            <span className="weather-icon-large">🌤️</span>
            Weather Forecast
          </h2>
          <button className="weather-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {loading && (
          <div className="weather-loading">
            <div className="loading-spinner"></div>
            <p>Loading weather data...</p>
          </div>
        )}

        {error && !weatherData && (
          <div className="weather-error">
            <div className="error-icon">⚠️</div>
            <h3>Weather Data Unavailable</h3>
            <p>{error}</p>
            <button className="retry-btn" onClick={fetchWeatherData}>
              🔄 Retry
            </button>
            <div className="error-details">
              <p><strong>Troubleshooting:</strong></p>
              <ul>
                <li>Check your internet connection</li>
                <li>API key may be invalid or expired</li>
                <li>Weather service may be temporarily unavailable</li>
              </ul>
            </div>
          </div>
        )}

        {weatherData && (
          <div className="weather-content">
            {/* Current Weather */}
            <div className="current-weather">
              <div className="location">
                <h3>{weatherData.name}, {weatherData.sys?.country}</h3>
                <p className="location-subtitle">Board Bazar, Gazipur, Bangladesh</p>
              </div>
              
              <div className="current-temp-section">
                <div className="temp-display">
                  <span className="current-temp">{Math.round(weatherData.main.temp)}°C</span>
                  <div className="weather-desc">
                    <span className="weather-emoji">
                      {getWeatherIcon(weatherData.weather[0]?.icon)}
                    </span>
                    <span className="desc-text">
                      {weatherData.weather[0]?.description}
                    </span>
                  </div>
                </div>
                
                <div className="feels-like">
                  Feels like {Math.round(weatherData.main.feels_like)}°C
                </div>
              </div>
            </div>

            {/* Weather Details Grid */}
            <div className="weather-details">
              <div className="detail-card">
                <div className="detail-icon">💧</div>
                <div className="detail-info">
                  <span className="detail-label">Humidity</span>
                  <span className="detail-value">{weatherData.main.humidity}%</span>
                </div>
              </div>
              
              <div className="detail-card">
                <div className="detail-icon">🌬️</div>
                <div className="detail-info">
                  <span className="detail-label">Wind Speed</span>
                  <span className="detail-value">{weatherData.wind?.speed || 0} m/s</span>
                </div>
              </div>
              
              <div className="detail-card">
                <div className="detail-icon">🔽</div>
                <div className="detail-info">
                  <span className="detail-label">Pressure</span>
                  <span className="detail-value">{weatherData.main.pressure} hPa</span>
                </div>
              </div>
              
              <div className="detail-card">
                <div className="detail-icon">👁️</div>
                <div className="detail-info">
                  <span className="detail-label">Visibility</span>
                  <span className="detail-value">{(weatherData.visibility / 1000).toFixed(1)} km</span>
                </div>
              </div>
            </div>

            {/* 3-Day Forecast */}
            {forecastData && (
              <div className="forecast-section">
                <h4 className="forecast-title">3-Day Forecast</h4>
                <div className="forecast-grid">
                  {forecastData.list.slice(0, 3).map((day, index) => (
                    <div key={index} className="forecast-card">
                      <div className="forecast-day">
                        {formatTime(day.dt)}
                      </div>
                      <div className="forecast-icon">
                        {getWeatherIcon(day.weather[0]?.icon)}
                      </div>
                      <div className="forecast-temp">
                        {Math.round(day.main.temp)}°C
                      </div>
                      <div className="forecast-desc">
                        {day.weather[0]?.main}
                      </div>
                      <div className="forecast-humidity">
                        💧 {day.main.humidity}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Weather;