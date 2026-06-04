import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { useAuth } from './hooks/useAuth.js';

// Pages
import Login from './pages/Login.jsx';
import ManagerDashboard from './pages/ManagerDashboard.jsx';
import OwnerDashboard from './pages/OwnerDashboard.jsx';

// Styles
import './styles/app.css';

function ProtectedRoute({ children, requiredRole = null }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    // If they have the wrong role, redirect them to THEIR correct dashboard, not login
    const target = user?.role === 'manager' ? '/manager' : '/owner';
    return <Navigate to={target} replace />;
  }

  return children;
}

function BackButtonHandler() {
  const location = useLocation();

  useEffect(() => {
    // Only register listener if we're in a Capacitor environment
    if (!window.Capacitor?.isNativePlatform()) return;

    const handleBackButton = ({ canGoBack }) => {
      // If at root pages, let the OS handle back (exit app)
      if (location.pathname === '/manager' || location.pathname === '/owner' || location.pathname === '/login') {
        CapacitorApp.exitApp();
      } else if (canGoBack) {
        window.history.back();
      } else {
        CapacitorApp.exitApp();
      }
    };

    const listenerPromise = CapacitorApp.addListener('backButton', handleBackButton);

    return () => {
      listenerPromise.then(listener => listener.remove());
    };
  }, [location]);

  return null;
}

export default function App() {
  const { init } = useAuth();

  useEffect(() => {
    init();
  }, []);

  return (
    <Router>
      <BackButtonHandler />
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route
          path="/manager"
          element={
            <ProtectedRoute requiredRole="manager">
              <ManagerDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/owner"
          element={
            <ProtectedRoute requiredRole="owner">
              <OwnerDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}
