import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import FloatingChatButton from './components/FloatingChatButton';
import ProtectedRoute from './components/ProtectedRoute';
import { ThemeProvider } from './context/ThemeContext';

// ── Core pages ────────────────────────────────────────────────────────────────
import Home          from './pages/Home';
import Instructions  from './pages/Instructions';
import Workout       from './pages/Workout';
import History       from './pages/History';
import Dashboard     from './pages/Dashboard';
import FitnessGuide  from './pages/FitnessGuide';
import Chatbot       from './pages/Chatbot';
import Auth          from './pages/Auth';
import Profile       from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';

// ── Social pages ──────────────────────────────────────────────────────────────
import Social        from './pages/Social';
import SocialFeed    from './pages/SocialFeed';
import SearchUsers   from './pages/SearchUsers';
import PublicProfile from './pages/PublicProfile';
import Leaderboard   from './pages/Leaderboard';
import Messages      from './pages/Messages';
import Notifications from './pages/Notifications';
import SavedPosts    from './pages/SavedPosts';
import Goals              from './pages/Goals';
import NutritionPlanner  from './pages/NutritionPlanner';
import Squads            from './pages/Squads';

import { getCurrentUser, seedDefaultAdmin } from './utils/auth';
import { syncProfile }    from './utils/supabaseBridge';
import { loadUserSession, clearActiveSession } from './utils/userDataManager';

// Routes that require authentication and role checks
const PROTECTED = ({ children, requireRole }) => (
  <ProtectedRoute requireRole={requireRole}>{children}</ProtectedRoute>
);

function App() {
  // ── On cold start: seed default admin and restore session for any user already logged in 
  useEffect(() => {
    seedDefaultAdmin();
    const user = getCurrentUser();
    if (user) {
      loadUserSession(user.id);
      syncProfile(user);
    }
  }, []);

  // ── React to login / logout events ──────────────────────────────────────────
  useEffect(() => {
    const onAuthChanged = (e) => {
      const user = e.detail;
      if (user?.id) {
        // User logged in — restore their scoped data (migration runs once)
        loadUserSession(user.id);
      } else {
        // User logged out — only clear the session token, never user data
        clearActiveSession();
      }
    };
    window.addEventListener('fittrack_auth_updated', onAuthChanged);
    return () => window.removeEventListener('fittrack_auth_updated', onAuthChanged);
  }, []);

  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen font-sans">
          <Navbar />

          <Routes>
          {/* ── Public routes ── */}
          <Route path="/auth"                   element={<Auth />} />

          {/* ── User protected routes ── */}
          <Route path="/"                       element={<PROTECTED requireRole="USER"><Home /></PROTECTED>} />
          <Route path="/guide"                  element={<PROTECTED requireRole="USER"><FitnessGuide /></PROTECTED>} />
          <Route path="/history"                element={<PROTECTED requireRole="USER"><History /></PROTECTED>} />

          {/* ── Workout flow (requires user auth) ── */}
          <Route path="/instructions/:type"     element={<PROTECTED requireRole="USER"><Instructions /></PROTECTED>} />
          <Route path="/workout/:type"          element={<PROTECTED requireRole="USER"><Workout /></PROTECTED>} />

          {/* ── Protected: requires sign-in ── */}
          <Route path="/dashboard"              element={<PROTECTED requireRole="USER"><Dashboard /></PROTECTED>} />
          <Route path="/chat"                   element={<PROTECTED requireRole="USER"><Chatbot /></PROTECTED>} />
          <Route path="/profile"                element={<PROTECTED requireRole="USER"><Profile /></PROTECTED>} />

          {/* ── Social hub ── */}
          <Route path="/social"                 element={<PROTECTED requireRole="USER"><Social /></PROTECTED>} />

          {/* ── Social: individual routes redirect into the hub ── */}
          <Route path="/feed"                   element={<Navigate to="/social?tab=feed"          replace />} />
          <Route path="/search"                 element={<Navigate to="/social?tab=search"        replace />} />
          <Route path="/messages"               element={<Navigate to="/social?tab=messages"      replace />} />
          <Route path="/notifications"          element={<Navigate to="/social?tab=notifications" replace />} />
          <Route path="/saved"                  element={<Navigate to="/social?tab=saved"         replace />} />

          {/* ── Leaderboard (standalone) ── */}
          <Route path="/leaderboard"            element={<PROTECTED requireRole="USER"><Leaderboard /></PROTECTED>} />

          {/* ── Goal Tracker ── */}
          <Route path="/goals"                  element={<PROTECTED requireRole="USER"><Goals /></PROTECTED>} />

          {/* ── AI Nutrition Planner (PRO) ── */}
          <Route path="/nutrition"              element={<PROTECTED requireRole="USER"><NutritionPlanner /></PROTECTED>} />

          {/* ── Squad System (PRO) ── */}
          <Route path="/squads"                element={<PROTECTED requireRole="USER"><Squads /></PROTECTED>} />

          {/* ── Public profiles ── */}
          {/* Primary route used by all internal links */}
          <Route path="/user/:id"               element={<PROTECTED requireRole="USER"><PublicProfile /></PROTECTED>} />
          {/* Alias so /profile/:id also works */}
          <Route path="/profile/:id"            element={<PROTECTED requireRole="USER"><PublicProfile /></PROTECTED>} />

          {/* ── Admin protected dashboard ── */}
          <Route path="/admin"                  element={<PROTECTED requireRole="ADMIN"><AdminDashboard /></PROTECTED>} />

          {/* ── Legacy / convenience aliases ── */}
          <Route path="/saved-posts"            element={<Navigate to="/saved" replace />} />
          <Route path="/friends"                element={<Navigate to="/search" replace />} />
          <Route path="/stories"                element={<Navigate to="/feed"   replace />} />
          <Route path="/settings"               element={<Navigate to="/profile" replace />} />

          {/* ── 404 fallback ── */}
          <Route path="*"                       element={<Navigate to="/" replace />} />
        </Routes>

        <FloatingChatButton />
      </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
