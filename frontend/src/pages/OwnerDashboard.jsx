import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useOwnerAnalytics } from '../hooks/useOwnerAnalytics.js';
import { useAuthStore, api } from '../store/authStore.js';
import PasswordChangeModal from '../components/PasswordChangeModal.jsx';
import DashboardLayout from '../components/DashboardLayout.jsx';

import OwnerAnalytics from '../components/owner/OwnerAnalytics.jsx';
import OwnerCheckins from '../components/owner/OwnerCheckins.jsx';
import OwnerMembers from '../components/owner/OwnerMembers.jsx';
import OwnerServices from '../components/owner/OwnerServices.jsx';
import OwnerCoupons from '../components/owner/OwnerCoupons.jsx';
import OwnerPlans from '../components/owner/OwnerPlans.jsx';
import OwnerStaff from '../components/owner/OwnerStaff.jsx';
import OwnerPartners from '../components/owner/OwnerPartners.jsx';
import OwnerCards from '../components/owner/OwnerCards.jsx';
import OwnerBranches from '../components/owner/OwnerBranches.jsx';

export default function OwnerDashboard() {
  const { user } = useAuth();
  const { selectedGymId } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname.split('/')[2] || 'analytics';
  const [timeframe, setTimeframe] = useState('today');
  const [showPasswordModal, setShowPasswordModal] = useState(user?.first_login === 1);
  const { data, loading, error, setError } = useOwnerAnalytics(timeframe);
  const [services, setServices] = useState([]);
  const [newService, setNewService] = useState({ name: '', price_daily: '', price_monthly: '', allow_monthly: true });
  const [message, setMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (user?.first_login === 1) {
      setShowPasswordModal(true);
    }
  }, [user]);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await api.get('/services');
      setServices(response.data.services || []);
    } catch (err) {
      console.warn('Failed to load services:', err.message || err);
    }
  };

  const handleCreateService = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (selectedGymId === 'all') {
      setError('Please select a specific branch from the top menu to create a service.');
      return;
    }

    if (!newService.name.trim()) {
      setError('Service name is required');
      return;
    }

    try {
      setActionLoading(true);
      await api.post('/services', {
        name: newService.name.trim(),
        price_daily: Number(newService.price_daily) || 0,
        price_monthly: Number(newService.price_monthly) || 0,
        allow_monthly: newService.allow_monthly
      });
      setMessage(`Service "${newService.name.trim()}" created successfully!`);
      setNewService({ name: '', price_daily: '', price_monthly: '', allow_monthly: true });
      fetchServices();
      // clear message after 3s
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create service');
      setTimeout(() => setError(null), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateService = async (serviceId, updatedData) => {
    setError(null);
    setMessage(null);
    try {
      setActionLoading(true);
      await api.patch(`/services/${serviceId}`, updatedData);
      setMessage(`Service updated successfully!`);
      fetchServices();
      setTimeout(() => setMessage(null), 3000);
      return true; // indicate success
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update service');
      setTimeout(() => setError(null), 3000);
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteService = async (serviceId) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    setError(null);
    setMessage(null);
    try {
      setActionLoading(true);
      await api.delete(`/services/${serviceId}`);
      setMessage('Service deleted successfully!');
      fetchServices();
      setTimeout(() => setMessage(null), 3000);
      return true;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete service');
      setTimeout(() => setError(null), 3000);
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  if (!user) return null;

  const tabs = [
    { id: 'analytics', label: 'Analytics Overview' },
    { id: 'checkins', label: 'Recent Check-ins' },
    { id: 'members', label: 'Members Directory' },
    { id: 'packages', label: 'Manage Packages' },
    { id: 'services', label: 'Manage Services' },
    { id: 'coupons', label: 'Manage Coupons' },
    { id: 'staff', label: 'Manage Staff' },
    { id: 'partners', label: 'Manage Partners (B2B)' },
    { id: 'cards', label: 'Manage Cards' },
    { id: 'branches', label: 'Manage Branches' }
  ];

  const branchWarning = selectedGymId === 'all' ? (
    <div className="alert alert-warning" style={{ marginBottom: '20px' }}>
      <strong>Note:</strong> You are viewing data across all branches. To create new items, please select a specific branch from the top menu.
    </div>
  ) : null;

  return (
    <>
      {showPasswordModal && (
        <PasswordChangeModal onClose={() => setShowPasswordModal(false)} />
      )}
      <DashboardLayout tabs={tabs} activeTab={activeTab} setActiveTab={(tab) => navigate(`/owner/${tab}`)}>
        {message && <div className="alert alert-success" style={{ marginBottom: '20px' }}>{message}</div>}
        {error && <div className="alert alert-error" style={{ marginBottom: '20px' }}>{error}</div>}

        {loading && activeTab !== 'packages' && activeTab !== 'services' && activeTab !== 'coupons' && activeTab !== 'staff' && activeTab !== 'partners' ? (
          <div className="card text-center" style={{ padding: '60px 20px' }}>
            <div className="spinner"></div>
            <p style={{ marginTop: '10px' }}>Analyzing business metrics...</p>
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<Navigate to="analytics" replace />} />
            
            <Route path="analytics" element={
              <OwnerAnalytics 
                data={data} 
                timeframe={timeframe} 
                setTimeframe={setTimeframe} 
                trendData={data?.trend?.data || []} 
              />
            } />
            
            <Route path="checkins" element={
              <OwnerCheckins data={data} />
            } />
            
            <Route path="members" element={
              <OwnerMembers activeMembers={data?.activeMembers} />
            } />
            
            <Route path="packages" element={
              <>
                {activeTab === 'packages' && branchWarning}
                <OwnerPlans services={services} />
              </>
            } />
            
            <Route path="services" element={
              <>
                {activeTab === 'services' && branchWarning}
                <OwnerServices 
                  services={services}
                  newService={newService}
                  setNewService={setNewService}
                  handleCreateService={handleCreateService}
                  handleUpdateService={handleUpdateService}
                  handleDeleteService={handleDeleteService}
                  actionLoading={actionLoading}
                />
              </>
            } />

            <Route path="coupons" element={
              <>
                {activeTab === 'coupons' && branchWarning}
                <OwnerCoupons setError={setError} setMessage={setMessage} />
              </>
            } />
            
            <Route path="staff" element={
              <>
                {activeTab === 'staff' && branchWarning}
                <OwnerStaff setError={setError} setMessage={setMessage} />
              </>
            } />
            
            <Route path="partners" element={
              <>
                {activeTab === 'partners' && branchWarning}
                <OwnerPartners setError={setError} setMessage={setMessage} />
              </>
            } />

            <Route path="cards" element={
              <>
                {activeTab === 'cards' && branchWarning}
                <OwnerCards setError={setError} setMessage={setMessage} />
              </>
            } />

            <Route path="branches" element={
              <OwnerBranches />
            } />
            
            <Route path="*" element={<Navigate to="analytics" replace />} />
          </Routes>
        )}
      </DashboardLayout>
    </>
  );
}
