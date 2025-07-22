import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/Login/Login.jsx";
import Homepage from "./pages/homepage/Homepage.jsx";
import Profile from "./pages/Profile/Profile.jsx";
import CatCorner from "./pages/CatCorner/CatCorner.jsx";

function App() {
  return (
    <Router>
      <Routes>
        {/* If you want “/” to go to login, keep it; otherwise you could redirect to /home */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/login" element={<LoginPage />} />

        <Route path="/home" element={<Homepage />} />

        <Route path="/profile" element={<Profile />} />

        {/* New CatCorner route */}
        <Route path="/catcorner" element={<CatCorner />} />

        {/* Catch‑all: redirect to home or login */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Router>
  );
}


export default App;
