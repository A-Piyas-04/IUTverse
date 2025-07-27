import './signup.css';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import loginImage from '../../assets/login.png';
import ApiService from '../../services/api.js';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const validateIUTEmail = (email) => {
    const iutEmailRegex = /^[a-zA-Z0-9._%+-]+@iut-dhaka\.edu$/;
    return iutEmailRegex.test(email);
  };

  const generatePassword = (email) => {
    const username = email.split('@')[0];
    if (username.length < 6) {
      throw new Error('Username too short');
    }
    
    const firstThree = username.substring(0, 3);
    const lastThree = username.substring(username.length - 3);
    const randomNum1 = Math.floor(Math.random() * 10);
    const randomNum2 = Math.floor(Math.random() * 10);
    
    return `${firstThree}${lastThree}${randomNum1}${randomNum2}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateIUTEmail(email)) {
      setMessage('Please enter a valid IUT email address (yourname@iut-dhaka.edu)');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Send signup request to backend using API service (only email, backend generates password)
      const result = await ApiService.signup(email);

      if (result.success) {
        setMessage('Password sent to your email! Redirecting to login...');
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
          <p className="signup-subtitle">Enter your IUT email to receive your login password</p>
          
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
          
          {message && (
            <div className={`message ${message.includes('sent') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}
          
          <button type="submit" disabled={loading}>
            {loading ? 'Sending Password...' : 'Send Password to Email'}
          </button>
          
          <div className="auth-link">
            Already have a password? <a href="/login">Login here</a>
          </div>
        </form>
      </div>
    </div>
  );
}
