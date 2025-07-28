import './login.css';
import { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import loginImage from '../../assets/login.png';
import ApiService from '../../services/api.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { authUtils } from '../../utils/auth.js';

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { login, logout, isAuthenticated, user } = useAuth();

  const validateIUTEmail = (email) => {
    const iutEmailRegex = /^[a-zA-Z0-9._%+-]+@iut-dhaka\.edu$/;
    return iutEmailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateIUTEmail(email)) {
      setMessage('Please enter a valid IUT email address (yourname@iut-dhaka.edu)');
      return;
    }

    if (!email || !password) {
      setMessage('Please fill in all fields');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const result = await ApiService.login(email, password);

      if (result.success) {
        // Store authentication data using auth context
        if (result.data.token) {
          login(result.data.token, result.data.user);
        }
        
        setMessage('Login successful! Redirecting...');
        
        // Redirect to homepage after successful login
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        setMessage(result.error || 'Invalid email or password. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setMessage('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setEmail("");
    setPassword("");
    setMessage('');
    // Use auth context logout function
    logout();
  };

  if (loggedIn) {
    const userData = authUtils.getUserData();
    const userEmail = userData ? userData.email : email;
    
    return (
      <div className="auth-bg center">
        <div className="auth-appname">Welcome, {userEmail}</div>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="auth-bg">
      <div className="auth-left">
        <div className="auth-left-content">
          <h1>IUTVerse</h1>
          <p>A dedicated social platform for the IUT community.</p>
          <p>Stay connected. Stay updated. Stay united.</p>
        </div>
      </div>

      <div
        className="auth-form-container"
        style={{ backgroundImage: `url(${loginImage})` }}
      >
        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>Login</h2>
          <label htmlFor="email">IUT Email</label>
          <input
            id="email"
            type="email"
            placeholder="yourname@iut-dhaka.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
          
          {message && (
            <div className="message error">
              {message}
            </div>
          )}
          
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
          
          <div className="auth-link">
            Don't have a password yet? <a href="/signup">Get started here</a>
          </div>
        </form>
      </div>
    </div>
  );
}
