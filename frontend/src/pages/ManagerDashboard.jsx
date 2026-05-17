import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../store/authStore.js';
import PasswordChangeModal from '../components/PasswordChangeModal.jsx';
import '../styles/dashboard.css';

const SERVICE_OPTIONS = ['gym', 'sauna', 'pool'];

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(user?.first_login === 1);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const [qrCode, setQrCode] = useState('');
  const [memberLookup, setMemberLookup] = useState(null);
  const [memberService, setMemberService] = useState('gym');

  const [walkInName, setWalkInName] = useState('');
  const [walkInService, setWalkInService] = useState('gym');
  const [walkInAmount, setWalkInAmount] = useState('10000');
  const [subscriptionOptions, setSubscriptionOptions] = useState([]);
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    phone: '',
    subscription_id: ''
  });
  const [newMemberQr, setNewMemberQr] = useState(null);

  useEffect(() => {
    if (user?.first_login === 1) {
      setShowPasswordModal(true);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboard();
    fetchSubscriptionOptions();
  }, []);

  const fetchSubscriptionOptions = async () => {
    try {
      const response = await api.get('/members/subscriptions');
      const subscriptions = response.data.subscriptions || [];
      setSubscriptionOptions(subscriptions);
      setNewMember((current) => ({
        ...current,
        subscription_id: current.subscription_id || subscriptions[0]?.id || ''
      }));
    } catch (err) {
      console.warn('Could not load subscription options:', err.message || err);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/dashboard/today');
      setDashboardData(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load manager dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleLookupQr = async (e) => {
    e.preventDefault();
    setMessage(null);
    setMemberLookup(null);
    setError(null);

    if (!qrCode.trim()) {
      setError('Please enter a QR code value');
      return;
    }

    try {
      const response = await api.post('/members/scan-qr', { qr_code_id: qrCode.trim() });
      setMemberLookup(response.data.member);
      setMemberService(response.data.member.allowed_services?.[0] || 'gym');
    } catch (err) {
      setError(err.response?.data?.error || 'Member lookup failed');
    }
  };

  const handleCheckinMember = async (e) => {
    e.preventDefault();
    if (!memberLookup) {
      setError('Lookup a member before checking in');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      await api.post('/checkins', {
        member_id: memberLookup.id,
        type: 'subscription',
        service: memberService
      });
      setMessage(`${memberLookup.name} checked in to ${memberService}`);
      setMemberLookup(null);
      setQrCode('');
      fetchDashboard();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to check in member');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckinWalkIn = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!walkInName.trim()) {
      setError('Please enter the walk-in name');
      return;
    }

    const amountValue = Number(walkInAmount);
    if (!amountValue || amountValue <= 0) {
      setError('Enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      await api.post('/checkins', {
        member_name: walkInName.trim(),
        type: 'walk_in',
        service: walkInService,
        amount: amountValue
      });
      setMessage(`${walkInName.trim()} checked in as walk-in for ${walkInService}`);
      setWalkInName('');
      setWalkInAmount('10000');
      fetchDashboard();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create walk-in check-in');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMember = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setNewMemberQr(null);

    if (!newMember.name.trim() || !newMember.subscription_id) {
      setError('Name and subscription tier are required');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/members', {
        name: newMember.name.trim(),
        email: newMember.email.trim() || null,
        phone: newMember.phone.trim() || null,
        subscription_id: newMember.subscription_id
      });

      setMessage(`${response.data.name} registered successfully`);
      setNewMemberQr(response.data.qr_code_id);
      setNewMember({
        name: '',
        email: '',
        phone: '',
        subscription_id: subscriptionOptions[0]?.id || ''
      });
      fetchDashboard();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to register member');
    } finally {
      setLoading(false);
    }
  };

  const handleRenewal = async (memberId) => {
    setError(null);
    setMessage(null);

    try {
      setLoading(true);
      const response = await api.post(`/members/${memberId}/subscriptions/renew`);
      setMessage(response.data.message || 'Subscription renewed');
      fetchDashboard();
    } catch (err) {
      setError(err.response?.data?.error || 'Renewal failed');
    } finally {
      setLoading(false);
    }
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
            <h1 className="header-title">🛠️ Manager Dashboard</h1>
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
          {error && <div className="alert alert-error">{error}</div>}
          {message && <div className="alert alert-success">{message}</div>}

          <div className="grid grid-2">
            <div className="card">
              <h2 className="card-title">Today Summary</h2>
              {loading && !dashboardData ? (
                <div className="text-center">
                  <div className="spinner"></div>
                  <p>Loading manager summary...</p>
                </div>
              ) : (
                <div className="grid summary-grid">
                  <div className="summary-card">
                    <div className="summary-value">
                      {dashboardData?.summary?.checkins_today ?? 0}
                    </div>
                    <div className="summary-label">Check-ins</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-value">
                      {(dashboardData?.summary?.revenue_today ?? 0).toLocaleString()}
                    </div>
                    <div className="summary-label">Revenue</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-value">
                      {dashboardData?.summary?.renewals_pending ?? 0}
                    </div>
                    <div className="summary-label">Pending Renewals</div>
                  </div>
                </div>
              )}
            </div>

            <div className="card">
              <h2 className="card-title">Quick Actions</h2>
              <div className="card-section">
                <p className="section-text">Scan a member QR code (placeholder)</p>
                <form onSubmit={handleLookupQr} className="inline-form">
                  <input
                    type="text"
                    placeholder="Paste member QR UUID"
                    value={qrCode}
                    onChange={(e) => setQrCode(e.target.value)}
                  />
                  <button className="btn-primary" type="submit" disabled={loading}>
                    Lookup
                  </button>
                </form>

                {memberLookup && (
                  <div className="card card-small">
                    <p>
                      <strong>{memberLookup.name}</strong> ({memberLookup.subscription_status})
                    </p>
                    <p style={{ marginBottom: '10px', color: '#4b5563' }}>
                      Allowed services: {memberLookup.allowed_services?.join(', ') || 'gym'}
                    </p>
                    <div className="form-group">
                      <label>Service</label>
                      <select
                        value={memberService}
                        onChange={(e) => setMemberService(e.target.value)}
                      >
                        {SERVICE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      className="btn-primary"
                      onClick={handleCheckinMember}
                      disabled={loading}
                    >
                      Check In Member
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-2">
            <div className="card">
              <h2 className="card-title">Register New Member</h2>
              <form onSubmit={handleCreateMember} className="form-stack">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    placeholder="Member name"
                    value={newMember.name}
                    onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    placeholder="Member email"
                    value={newMember.email}
                    onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="text"
                    placeholder="Member phone"
                    value={newMember.phone}
                    onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Subscription Tier</label>
                  <select
                    value={newMember.subscription_id}
                    onChange={(e) => setNewMember({ ...newMember, subscription_id: e.target.value })}
                  >
                    {subscriptionOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name} ({Number(option.monthly_fee).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
                <button className="btn-primary" type="submit" disabled={loading}>
                  Register Member
                </button>
              </form>
              {newMemberQr && (
                <div className="card card-small" style={{ marginTop: '20px' }}>
                  <p style={{ marginBottom: '8px' }}>New QR code for testing:</p>
                  <pre style={{ whiteSpace: 'break-spaces', wordBreak: 'break-word', margin: 0 }}>
                    {newMemberQr}
                  </pre>
                </div>
              )}
            </div>

            <div className="card">
              <h2 className="card-title">Pending Renewals</h2>
              {dashboardData?.pending_renewals?.length ? (
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Plan</th>
                      <th>Due</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.pending_renewals.map((item) => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td>{item.subscription}</td>
                        <td>{item.next_renewal_date}</td>
                        <td>
                          <button
                            className="btn-secondary btn-small"
                            onClick={() => handleRenewal(item.id)}
                            disabled={loading}
                          >
                            Renew
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="section-text">No renewals pending for today.</p>
              )}
            </div>
          </div>

          <div className="card">
            <h2 className="card-title">Recent Check-Ins</h2>
            {dashboardData?.recent_checkins?.length ? (
              <table>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Service</th>
                    <th>Type</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.recent_checkins.map((item, index) => (
                    <tr key={`${item.member_name}-${index}`}>
                      <td>{item.member_name}</td>
                      <td>{item.service}</td>
                      <td>{item.type}</td>
                      <td>{item.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="section-text">No recent check-ins yet.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
