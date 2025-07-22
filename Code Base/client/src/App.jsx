import { useState } from 'react';
import './App.css';

const BRICK_RED = '#B22222';
const WHITE = '#fff';
const APP_NAME = 'IUTverse';

function useAuth() {
  const [user, setUser] = useState(null);
  const login = (userData) => setUser(userData);
  const logout = () => setUser(null);
  return { user, login, logout };
}

function AuthPage({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (email && password) {
        onLogin({ email });
      } else {
        setError('Please enter email and password.');
      }
    }, 800);
  };

  return (
    <div className="auth-bg">
      {/* Left side: App name */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 0,
      }}>
        <span className="auth-appname">
          {APP_NAME}
        </span>
      </div>
      {/* Right side: Auth form */}
      <div className="auth-form-container">
        <form
          onSubmit={handleSubmit}
          className="auth-form"
        >
          <h2>{isLogin ? 'Login' : 'Sign Up'}</h2>
          <div>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div style={{ color: 'red', marginBottom: 4, fontWeight: 600 }}>{error}</div>}
          <button
            type="submit"
            disabled={loading}
          >
            {loading ? (isLogin ? 'Logging in...' : 'Signing up...') : (isLogin ? 'Login' : 'Sign Up')}
          </button>
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <button
              type="button"
              className="auth-toggle-btn"
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
            >
              {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function HomePage({ onLogout, user }) {
  return (
    <div style={{ minHeight: '100vh', background: WHITE, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <h1 style={{ color: BRICK_RED }}>Welcome, {user.email}!</h1>
      <button onClick={onLogout} style={{ marginTop: 24, background: BRICK_RED, color: WHITE, padding: 10, border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 16 }}>
        Logout
      </button>
    </div>
  );
}

function App() {
  const { user, login, logout } = useAuth();

  if (!user) {
    return <AuthPage onLogin={login} />;
  }
  return <HomePage user={user} onLogout={logout} />;
}

export default App;
