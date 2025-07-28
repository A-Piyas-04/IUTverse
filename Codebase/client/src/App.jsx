import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import LoginPage from "./pages/Login/Login.jsx";
import SignupPage from "./pages/Signup/Signup.jsx";
import Homepage from "./pages/homepage/Homepage.jsx";
import Profile from "./pages/Profile/Profile.jsx";
import CatCorner from "./pages/CatCorner/CatCorner.jsx";
import LostAndFound from "./pages/LostAndFound/LostAndFound.jsx";
import JobsPage from "./pages/Jobs/JobsPage.jsx";
import Confessions from "./pages/Confessions/Confessions.jsx";
import Moderation from "./pages/Admin/Moderation.jsx";
import EventHub from "./pages/EventHub/EventHub.jsx";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/home" element={<Homepage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/catcorner" element={<CatCorner />} />
        <Route path="/lostandfound" element={<LostAndFound />} />

        {/* New Jobs route */}
        <Route path="/jobs" element={<JobsPage />} />

        {/* Confessions route */}
        <Route path="/confessions" element={<Confessions />} />

        {/* Admin routes */}
        <Route path="/admin/moderation" element={<Moderation />} />
        {/* New Event Hub route */}
        <Route path="/eventhub" element={<EventHub />} />

        {/* Catch‑all: redirect to root */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
