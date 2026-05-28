import './signup.css';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import loginImage from '../../assets/login.png';
import ApiService from '../../services/api.js';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

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

    if (password.length < 8) {
      setMessage('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const result = await ApiService.signup(email, password, name);

      if (result.success) {
        setMessage('Account created! Check your email if confirmation is enabled. Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setMessage(result.error || 'Failed to send password. Please try again.');
      }
    } catch (error) {
      console.error('Signup error:', error);
      setMessage('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-left">
        <div className="auth-left-content">
          <h1>IUTVerse</h1>
          <p>Join the exclusive social platform for IUT students.</p>
          <p>Connect with your fellow IUTians and stay engaged with campus life.</p>
          <p className="iut-only">For IUT students only - Use your IUT email to get started!</p>
        </div>
      </div>

      <div className="auth-form-container" style={{ backgroundImage: `url(${loginImage})` }}>
        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>Get Started</h2>
          <p className="signup-subtitle">Create your IUTverse account with your IUT email</p>
          
          <label htmlFor="name">Display Name</label>
          <input
            id="name"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
          />

          <label htmlFor="email">IUT Email Address</label>
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
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
          
          {message && (
            <div className={`message ${message.includes('created') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}
          
          <button type="submit" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
          
          <div className="auth-link">
            Already have an account? <a href="/login">Login here</a>
          </div>
        </form>
      </div>
    </div>
  );
}
