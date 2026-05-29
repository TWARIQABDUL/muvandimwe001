import React from 'react';
import { useAuth } from '../hooks/useAuth.js';
import '../styles/layout.css';

export default function Sidebar({ tabs, activeTab, setActiveTab }) {
  const { logout, user } = useAuth();

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        My Gym
      </div>
      
      <div className="sidebar-nav">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={logout}>
          Sign Out
        </button>
      </div>
    </div>
  );
}
