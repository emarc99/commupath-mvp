import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ImpactMap from './pages/ImpactMap';
import QuestHub from './pages/QuestHub';
import Leaderboard from './pages/Leaderboard';
import CommunityBoard from './pages/CommunityBoard';
import CreatorDashboard from './pages/CreatorDashboard';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Router>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'rgba(17, 24, 39, 0.95)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#f9fafb',
                backdropFilter: 'blur(10px)',
              },
              className: 'sonner-toast',
            }}
            richColors
          />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="map" element={<ImpactMap />} />
              <Route path="quests" element={<QuestHub />} />
              <Route path="community" element={<CommunityBoard />} />
              <Route path="creator" element={<CreatorDashboard />} />
              <Route path="leaderboard" element={<Leaderboard />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
