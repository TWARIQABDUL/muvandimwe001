import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useOwnerAnalytics } from '../hooks/useOwnerAnalytics.js';
import PasswordChangeModal from '../components/PasswordChangeModal.jsx';
import '../styles/dashboard.css';

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [timeframe, setTimeframe] = useState('today');
  const [showPasswordModal, setShowPasswordModal] = useState(user?.first_login === 1);
  const { data, loading, error } = useOwnerAnalytics(timeframe);
  const dashboardData = data?.dashboard;
  const activeMembers = data?.activeMembers;
  const trendData = data?.trend?.data || [];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="dashboard">
      {showPasswordModal && (
        <PasswordChangeModal onClose={() => setShowPasswordModal(false)} />
      )}

      <header className="header">
        <div className="container">
          <div className="header-content">
            <h1 className="header-title">📊 Owner Dashboard</h1>
            <div className="header-user">
              <div className="header-user-info">
                <div className="header-user-email">{user.email}</div>
                <div className="header-user-role">{user.role}</div>
              </div>
              <button className="btn-danger btn-small" onClick={handleLogout}>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container">
        <div className="dashboard-content">
          {/* Timeframe Selector */}
          <div className="card">
            <div className="flex-between">
              <h2 className="card-title">Analytics</h2>
              <div className="timeframe-buttons">
                {['today', 'week', 'month', 'year'].map(tf => (
                  <button
                    key={tf}
                    className={`btn-timeframe ${timeframe === tf ? 'active' : ''}`}
                    onClick={() => setTimeframe(tf)}
                  >
                    {tf.charAt(0).toUpperCase() + tf.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {loading ? (
            <div className="card text-center">
              <div className="spinner"></div>
              <p>Loading dashboard...</p>
            </div>
          ) : dashboardData ? (
            <>
              {/* Snapshot Cards */}
              <div className="grid grid-4">
                <div className="snapshot-card">
                  <div className="snapshot-value">{dashboardData.snapshot.total_checkins}</div>
                  <div className="snapshot-label">Check-ins</div>
                </div>
                <div className="snapshot-card">
                  <div className="snapshot-value">
                    {(dashboardData.snapshot.total_revenue || 0).toLocaleString()}
                  </div>
                  <div className="snapshot-label">Revenue</div>
                </div>
                <div className="snapshot-card">
                  <div className="snapshot-value">{dashboardData.snapshot.active_subscriptions}</div>
                  <div className="snapshot-label">Active Members</div>
                </div>
                <div className="snapshot-card">
                  <div className="snapshot-value">
                    {(dashboardData.snapshot.estimated_mrr / 1000).toFixed(1)}M
                  </div>
                  <div className="snapshot-label">Est. MRR</div>
                </div>
              </div>

              {/* Revenue Breakdown */}
              <div className="card">
                <h2 className="card-title">Revenue Breakdown</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Walk-in</th>
                      <th>Daily</th>
                      <th>Subscription</th>
                      <th>B2B</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(dashboardData.revenue_breakdown || {}).map(([service, breakdown]) => (
                      <tr key={service}>
                        <td style={{ textTransform: 'capitalize', fontWeight: '600' }}>
                          {service}
                        </td>
                        <td>{breakdown.walk_in.toLocaleString()}</td>
                        <td>{breakdown.daily.toLocaleString()}</td>
                        <td>{breakdown.subscription.toLocaleString()}</td>
                        <td>{breakdown.b2b.toLocaleString()}</td>
                        <td style={{ fontWeight: '600', color: '#2563eb' }}>
                          {breakdown.total.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Revenue by Service (Pie Chart Placeholder) */}
              <div className="card">
                <h2 className="card-title">Revenue Distribution</h2>
                <div className="pie-chart-placeholder">
                  {Object.entries(dashboardData.revenue_by_service || {}).map(([service, serviceData]) => (
                    <div key={service} className="pie-item">
                      <div className="pie-percentage">{serviceData.percentage}%</div>
                      <div className="pie-label" style={{ textTransform: 'capitalize' }}>
                        {service}: {serviceData.amount.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h2 className="card-title">7-Day Revenue Trend</h2>
                {trendData.length ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trendData.map((entry) => (
                        <tr key={entry.date}>
                          <td>{entry.date}</td>
                          <td>{entry.revenue.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: '#6b7280' }}>
                    No trend data available yet for the last 7 days.
                  </p>
                )}
              </div>

              <div className="card">
                <h2 className="card-title">Active Members Breakdown</h2>
                {activeMembers?.by_tier?.length ? (
                  <>
                    <div className="flex-between" style={{ marginBottom: '12px' }}>
                      <span>{activeMembers.total_active} active members</span>
                      <span>Estimated MRR: {activeMembers.estimated_mrr.toLocaleString()}</span>
                    </div>
                    <table>
                      <thead>
                        <tr>
                          <th>Plan</th>
                          <th>Members</th>
                          <th>Monthly Rev / Member</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeMembers.by_tier.map((tier) => (
                          <tr key={tier.subscription_name}>
                            <td>{tier.subscription_name}</td>
                            <td>{tier.count}</td>
                            <td>{Number(tier.monthly_revenue_per_member).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                ) : (
                  <p style={{ color: '#6b7280' }}>
                    Active membership data is not available yet.
                  </p>
                )}
              </div>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
