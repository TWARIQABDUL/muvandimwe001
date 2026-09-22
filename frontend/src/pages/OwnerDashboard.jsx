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
import OwnerProducts from '../components/owner/OwnerProducts.jsx';
import DailyReport from '../components/DailyReport.jsx';
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
  const [gyms, setGyms] = useState([]);
  const [services, setServices] = useState([]);
  const [newService, setNewService] = useState({ name: '', price_daily: '', price_monthly: '', allow_monthly: true, category: '', sort_order: '' });
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({ name: '', unit_price: '', sort_order: '' });
  const [message, setMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (user?.first_login === 1) {
      setShowPasswordModal(true);
    }
  }, [user]);

  useEffect(() => {
    fetchServices();
    fetchProducts();
    fetchGyms();
  }, []);

  const fetchGyms = async () => {
    try {
      const response = await api.get('/gyms');
      setGyms(response.data.gyms || []);
    } catch (err) {
      console.warn('Failed to load branches:', err.message || err);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await api.get('/services');
      setServices(response.data.services || []);
    } catch (err) {
      console.warn('Failed to load services:', err.message || err);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      setProducts(response.data.products || []);
    } catch (err) {
      console.warn('Failed to load shop items:', err.message || err);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (selectedGymId === 'all') {
      setError('Please select a specific branch from the top menu to add a shop item.');
      return;
    }

    if (!newProduct.name.trim()) {
      setError('Item name is required');
      return;
    }

    try {
      setActionLoading(true);
      await api.post('/products', {
        name: newProduct.name.trim(),
        unit_price: Number(newProduct.unit_price) || 0,
        sort_order: Number(newProduct.sort_order) || 100
      });
      setMessage(`Shop item "${newProduct.name.trim()}" added.`);
      setNewProduct({ name: '', unit_price: '', sort_order: '' });
      fetchProducts();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add shop item');
      setTimeout(() => setError(null), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateProduct = async (productId, updatedData) => {
    setError(null);
    setMessage(null);
    try {
      setActionLoading(true);
      await api.patch(`/products/${productId}`, updatedData);
      setMessage('Shop item updated.');
      fetchProducts();
      setTimeout(() => setMessage(null), 3000);
      return true;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update shop item');
      setTimeout(() => setError(null), 3000);
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Remove this shop item?')) return;
    setError(null);
    setMessage(null);
    try {
      setActionLoading(true);
      const response = await api.delete(`/products/${productId}`);
      setMessage(response.data.message || 'Shop item removed.');
      fetchProducts();
      setTimeout(() => setMessage(null), 4000);
      return true;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove shop item');
      setTimeout(() => setError(null), 3000);
      return false;
    } finally {
      setActionLoading(false);
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
        allow_monthly: newService.allow_monthly,
        category: newService.category.trim(),
        sort_order: Number(newService.sort_order) || 100
      });
      setMessage(`Service "${newService.name.trim()}" created successfully!`);
      setNewService({ name: '', price_daily: '', price_monthly: '', allow_monthly: true, category: '', sort_order: '' });
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
    { id: 'daily-report', label: 'Daily Report' },
    { id: 'members', label: 'Members Directory' },
    { id: 'packages', label: 'Manage Packages' },
    { id: 'services', label: 'Manage Services' },
    { id: 'products', label: 'Manage Shop Items' },
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', padding: '16px', backgroundColor: 'var(--card-bg, white)', borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary, #1e293b)' }}>Branch Context</h2>
          <select 
            value={selectedGymId} 
            onChange={(e) => {
              useAuthStore.getState().setSelectedGymId(e.target.value);
              window.location.reload();
            }}
            style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'var(--bg-color, #f8fafc)', color: 'var(--text-primary, #1e293b)', fontSize: '1rem', width: '100%', maxWidth: '400px', cursor: 'pointer' }}
          >
            <option value="all">🏢 All Branches (Combined)</option>
            {gyms.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        {message && <div className="alert alert-success" style={{ marginBottom: '20px' }}>{message}</div>}
        {error && <div className="alert alert-error" style={{ marginBottom: '20px' }}>{error}</div>}

        {loading && activeTab !== 'packages' && activeTab !== 'services' && activeTab !== 'coupons' && activeTab !== 'staff' && activeTab !== 'partners' && activeTab !== 'products' && activeTab !== 'daily-report' ? (
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
            
            <Route path="daily-report" element={
              <DailyReport date={new Date().toISOString().split('T')[0]} readOnly />
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

            <Route path="products" element={
              <>
                {activeTab === 'products' && branchWarning}
                <OwnerProducts
                  products={products}
                  newProduct={newProduct}
                  setNewProduct={setNewProduct}
                  handleCreateProduct={handleCreateProduct}
                  handleUpdateProduct={handleUpdateProduct}
                  handleDeleteProduct={handleDeleteProduct}
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
