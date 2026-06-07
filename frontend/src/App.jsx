import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { Modal, Typography } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useAuth } from './hooks/useAuth.js';
import { useAppUpdate } from './hooks/useAppUpdate.js';

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
      const rootPaths = ['/manager', '/manager/checkin', '/owner', '/owner/analytics', '/login'];
      if (rootPaths.includes(location.pathname) || location.pathname === '/') {
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
  const { updateAvailable, updateInfo, downloadUpdate, ignoreUpdate } = useAppUpdate();

  useEffect(() => {
    init();
  }, []);

  return (
    <Router>
      <BackButtonHandler />
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route
          path="/manager/*"
          element={
            <ProtectedRoute requiredRole="manager">
              <ManagerDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/owner/*"
          element={
            <ProtectedRoute requiredRole="owner">
              <OwnerDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>

      {/* OTA / APK Updater Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DownloadOutlined style={{ color: '#1890ff' }} />
            <span>Update Available!</span>
          </div>
        }
        open={updateAvailable}
        onOk={downloadUpdate}
        onCancel={ignoreUpdate}
        okText="Download Update"
        cancelText="Remind me later"
        centered
        maskClosable={false}
      >
        <Typography.Paragraph>
          A new version of the app (v{updateInfo?.version}) is available. 
        </Typography.Paragraph>
        {updateInfo?.releaseNotes && (
          <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
            <Typography.Text type="secondary" strong>What's new:</Typography.Text>
            <br />
            <Typography.Text>{updateInfo.releaseNotes}</Typography.Text>
          </div>
        )}
        <Typography.Paragraph type="secondary">
          Clicking download will open your browser to save the update file (.apk). Once downloaded, simply tap the file to install the latest version!
        </Typography.Paragraph>
      </Modal>

    </Router>
  );
}
