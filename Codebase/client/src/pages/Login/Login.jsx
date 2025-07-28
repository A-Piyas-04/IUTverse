import "./login.css";
import { useState } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import loginImage from "../../assets/login.png";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const validateIUTEmail = (email) => {
    const iutEmailRegex = /^[a-zA-Z0-9._%+-]+@iut-dhaka\.edu$/;
    return iutEmailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (email && password) {
      if (!validateIUTEmail(email)) {
        setMessage("Please enter a valid IUT email address.");
        return;
      }
      setLoading(true);
      setMessage("");
      // Simulate login (replace with real API call)
      setTimeout(() => {
        setLoading(false);
        setLoggedIn(true);
        localStorage.setItem("user", JSON.stringify({ email }));
        navigate("/home");
      }, 1000);
    }
  };

  const handleLogout = () => {
    setEmail("");
    setPassword("");
    setLoggedIn(false);
    setMessage("");
    localStorage.removeItem("user");
  };

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

          {message && <div className="message error">{message}</div>}

          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>

          <div className="auth-link">
            Don't have a password yet? <a href="/signup">Get started here</a>
          </div>
        </form>
      </div>
    </div>
  );
}
