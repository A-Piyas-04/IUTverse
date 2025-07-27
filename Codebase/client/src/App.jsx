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
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { authUtils } from "./utils/auth.js";


function App() {
  const isAuthenticated = authUtils.isAuthenticated();

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} 
        />
        <Route 
          path="/signup" 
          element={isAuthenticated ? <Navigate to="/" replace /> : <SignupPage />} 
        />
        
        {/* Protected routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <Homepage />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
        <Route path="/catcorner" element={
          <ProtectedRoute>
            <CatCorner />
          </ProtectedRoute>
        } />
        <Route path="/lostandfound" element={
          <ProtectedRoute>
            <LostAndFound />
          </ProtectedRoute>
        } />
        <Route path="/jobs" element={
          <ProtectedRoute>
            <JobsPage />
          </ProtectedRoute>
        } />
        <Route path="/confessions" element={
          <ProtectedRoute>
            <Confessions />
          </ProtectedRoute>
        } />
        <Route path="/admin/moderation" element={
          <ProtectedRoute>
            <Moderation />
          </ProtectedRoute>
        } />
        <Route path="/eventhub" element={
          <ProtectedRoute>
            <EventHub />
          </ProtectedRoute>
        } />

        {/* Catch‑all: redirect based on authentication */}
        <Route path="*" element={
          <Navigate to={isAuthenticated ? "/" : "/login"} replace />
        } />
      </Routes>
    </Router>
  );
}

export default App;
