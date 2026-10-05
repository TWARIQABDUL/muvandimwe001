import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useAuthStore, api } from '../store/authStore.js';
import { useRefresh } from '../hooks/useRefresh.jsx';
import PullToRefresh from './PullToRefresh.jsx';
import '../styles/layout.css';

export default function DashboardLayout({ tabs, activeTab, setActiveTab, children }) {
  const { user } = useAuth();
  const { refresh, isRefreshing } = useRefresh();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const activeTabLabel = tabs.find(t => t.id === activeTab)?.label || 'Dashboard';

  // Close mobile menu when active tab changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeTab]);



  return (
    <div className="dashboard-layout">
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      <Sidebar 
        tabs={tabs} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      
      <div className="main-content">
        <header className="top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button 
              className="mobile-menu-btn" 
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <h1 className="page-title">{activeTabLabel}</h1>
          </div>
          <div className="user-profile" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <button
              type="button"
              className="refresh-btn"
              onClick={refresh}
              disabled={isRefreshing}
              title="Refresh this page"
              aria-label="Refresh this page"
            >
              <svg
                width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ animation: isRefreshing ? 'spin 900ms linear infinite' : 'none' }}
              >
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
            </button>

            <div className="user-details">
              <div className="user-email">{user?.username || 'User'}</div>
              <div className="user-role">{user?.role || 'Guest'}</div>
            </div>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-color)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '600'
            }}>
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </header>
        
        <PullToRefresh>
          {children}
        </PullToRefresh>
      </div>
    </div>
  );
}
