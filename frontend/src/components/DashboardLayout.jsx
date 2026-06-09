import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useAuthStore, api } from '../store/authStore.js';
import '../styles/layout.css';

export default function DashboardLayout({ tabs, activeTab, setActiveTab, children }) {
  const { user } = useAuth();
  const { selectedGymId, setSelectedGymId } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [gyms, setGyms] = useState([]);
  
  const activeTabLabel = tabs.find(t => t.id === activeTab)?.label || 'Dashboard';

  // Close mobile menu when active tab changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeTab]);

  useEffect(() => {
    if (user?.role === 'owner') {
      const fetchGyms = async () => {
        try {
          const res = await api.get('/gyms');
          setGyms(res.data.gyms || []);
        } catch (err) {
          console.error("Failed to load branches:", err);
        }
      };
      fetchGyms();
    }
  }, [user]);

  const handleGymChange = (e) => {
    setSelectedGymId(e.target.value);
    // Optional: reload the page to cleanly refetch all dashboard components
    window.location.reload();
  };

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
            {user?.role === 'owner' && (
              <select 
                value={selectedGymId} 
                onChange={handleGymChange}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white' }}
              >
                <option value="all">🏢 All Branches (Combined)</option>
                {gyms.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            )}
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
        
        <main className="content-area">
          {children}
        </main>
      </div>
    </div>
  );
}
