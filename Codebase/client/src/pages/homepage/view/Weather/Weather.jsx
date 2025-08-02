import React, { useState, useEffect } from 'react';
import './Weather.css';

const Weather = ({ isOpen, onClose }) => {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // OpenWeatherMap API configuration
  const API_KEY = '2c999e981b16c2c6b2b5c7b5c6b5c7b5'; // You'll need to get your own API key
  const CITY = 'Board Bazar,Gazipur,BD';
  const API_URL = `https://api.openweathermap.org/data/2.5/weather?q=${CITY}&appid=${API_KEY}&units=metric`;
  const FORECAST_URL = `https://api.openweathermap.org/data/2.5/forecast?q=${CITY}&appid=${API_KEY}&units=metric`;

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
      // Fetch current weather
      const weatherResponse = await fetch(API_URL);
      if (!weatherResponse.ok) {
        throw new Error('Weather data not available');
      }
      const weather = await weatherResponse.json();
      setWeatherData(weather);

      // Fetch 5-day forecast
      const forecastResponse = await fetch(FORECAST_URL);
      if (!forecastResponse.ok) {
        throw new Error('Forecast data not available');
      }
      const forecast = await forecastResponse.json();
      setForecastData(forecast);
    } catch (err) {
      setError(err.message);
      // Fallback to mock data for demo purposes
      setWeatherData({
        name: 'Board Bazar',
        sys: { country: 'BD' },
        main: {
          temp: 28,
          feels_like: 32,
          humidity: 75,
          pressure: 1013
        },
        weather: [{
          main: 'Clouds',
          description: 'scattered clouds',
          icon: '03d'
        }],
        wind: { speed: 3.5 },
        visibility: 10000
      });
      
      setForecastData({
        list: [
          {
            dt: Date.now() / 1000 + 86400,
            main: { temp: 29, humidity: 70 },
            weather: [{ main: 'Rain', description: 'light rain', icon: '10d' }]
          },
          {
            dt: Date.now() / 1000 + 172800,
            main: { temp: 27, humidity: 80 },
            weather: [{ main: 'Clouds', description: 'overcast clouds', icon: '04d' }]
          },
          {
            dt: Date.now() / 1000 + 259200,
            main: { temp: 30, humidity: 65 },
            weather: [{ main: 'Clear', description: 'clear sky', icon: '01d' }]
          }
        ]
      });
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
            <p>Unable to fetch live weather data. Please try again later.</p>
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