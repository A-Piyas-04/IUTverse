import "./login.css";
import { useState } from "react";
import loginImage from "../../assets/login.png";
import { useNavigate, NavLink } from "react-router-dom";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email && password) {
      setLoggedIn(true);
      navigate("/home");
    }
  };

  const navigate = useNavigate();

  const handleLogout = () => {
    setEmail("");
    setPassword("");
    setLoggedIn(false);
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
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Login</button>
        </form>
      </div>
    </div>
  );
}
