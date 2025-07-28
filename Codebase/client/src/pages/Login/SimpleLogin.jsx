import React from 'react';
import './login.css';

// Simple debug version of the login page to test basic rendering
export default function SimpleLoginPage() {
  return (
    <div className="auth-bg">
      <div className="auth-left">
        <div className="auth-left-content">
          <h1>IUTVerse</h1>
          <p>A dedicated social platform for the IUT community.</p>
          <p>Stay connected. Stay updated. Stay united.</p>
        </div>
      </div>

      <div className="auth-form-container">
        <form className="auth-form">
          <h2>Login</h2>
          <label htmlFor="email">IUT Email</label>
          <input
            id="email"
            type="email"
            placeholder="yourname@iut-dhaka.edu"
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
          />
          
          <button type="submit">
            Login
          </button>
          
          <div className="auth-link">
            Don't have a password yet? <a href="/signup">Get started here</a>
          </div>
        </form>
      </div>
    </div>
  );
}
