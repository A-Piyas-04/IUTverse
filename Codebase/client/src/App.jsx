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
import { AuthProvider, useAuth } from "./contexts/AuthContext.jsx";

// Loading component
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
      <p className="text-green-600 font-medium">Loading IUTverse...</p>
    </div>
  </div>
);

// App Routes Component (needs to be inside AuthProvider)
function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      {/* Public routes - no auth check needed */}
      <Route
        path="/login"
        element={<LoginPage />}
      />
      <Route
        path="/signup"
        element={<SignupPage />}
      />

      {/* Protected routes */}
      <Route
        path="/"
        element={isAuthenticated ? <Homepage /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/catcorner"
        element={
          <ProtectedRoute>
            <CatCorner />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lostandfound"
        element={
          <ProtectedRoute>
            <LostAndFound />
          </ProtectedRoute>
        }
      />
      <Route
        path="/jobs"
        element={
          <ProtectedRoute>
            <JobsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/confessions"
        element={
          <ProtectedRoute>
            <Confessions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/moderation"
        element={
          <ProtectedRoute>
            <Moderation />
          </ProtectedRoute>
        }
      />
      <Route
        path="/eventhub"
        element={
          <ProtectedRoute>
            <EventHub />
          </ProtectedRoute>
        }
      />

      {/* Catch‑all: redirect based on authentication */}
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />}
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
