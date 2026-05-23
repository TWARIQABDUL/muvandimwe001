import React from 'react';
import Sidebar from './Sidebar.jsx';
import { useAuth } from '../hooks/useAuth.js';
import '../styles/layout.css';

export default function DashboardLayout({ tabs, activeTab, setActiveTab, children }) {
  const { user } = useAuth();
  
  const activeTabLabel = tabs.find(t => t.id === activeTab)?.label || 'Dashboard';

  return (
    <div className="dashboard-layout">
      <Sidebar tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="main-content">
        <header className="top-header">
          <h1 className="page-title">{activeTabLabel}</h1>
          <div className="user-profile">
            <div className="user-details">
              <div className="user-email">{user?.email || 'User'}</div>
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
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </header>
        
        <main className="content-area">
          {children}
        </main>
      </div>
    </div>
  );
}
