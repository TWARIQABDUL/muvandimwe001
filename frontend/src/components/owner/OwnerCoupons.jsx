import React, { useState, useEffect } from 'react';
import { api } from '../../store/authStore.js';
import { Table } from 'antd';

export default function OwnerCoupons({ setError, setMessage }) {
  const [coupons, setCoupons] = useState([]);
  const [newCoupon, setNewCoupon] = useState({ code: '', discount_percent: '' });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const response = await api.get('/coupons');
      setCoupons(response.data.coupons || []);
    } catch (err) {
      console.error('Failed to load coupons:', err.message || err);
      setError('Failed to load coupons directory');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const cleanCode = newCoupon.code.trim().toUpperCase();
    const discount = Number(newCoupon.discount_percent);

    if (!cleanCode) {
      setError('Coupon code is required');
      return;
    }

    if (isNaN(discount) || discount < 1 || discount > 100) {
      setError('Discount must be a valid percent between 1 and 100');
      return;
    }

    try {
      setActionLoading(true);
      await api.post('/coupons', {
        code: cleanCode,
        discount_percent: discount
      });
      setMessage(`Coupon "${cleanCode}" successfully created!`);
      setNewCoupon({ code: '', discount_percent: '' });
      fetchCoupons();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create coupon');
      setTimeout(() => setError(null), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleCoupon = async (coupon) => {
    setError(null);
    setMessage(null);
    try {
      setActionLoading(true);
      const updatedActive = coupon.active === 1 ? 0 : 1;
      await api.patch(`/coupons/${coupon.id}`, { active: updatedActive });
      setMessage(`Coupon "${coupon.code}" status toggled!`);
      fetchCoupons();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update coupon');
      setTimeout(() => setError(null), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCoupon = async (coupon) => {
    if (!window.confirm(`Are you sure you want to delete coupon "${coupon.code}"?`)) return;
    setError(null);
    setMessage(null);
    try {
      setActionLoading(true);
      await api.delete(`/coupons/${coupon.id}`);
      setMessage(`Coupon "${coupon.code}" deleted successfully!`);
      fetchCoupons();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete coupon');
      setTimeout(() => setError(null), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card text-center" style={{ padding: '40px 20px' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '10px' }}>Loading coupons directory...</p>
      </div>
    );
  }

  return (
    <div className="coupons-tab" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      <div className="grid grid-2">
        {/* Create Coupon Form */}
        <div className="card">
          <h2 className="card-title">Create New Promo Coupon</h2>
          <form onSubmit={handleCreateCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div className="form-group">
              <label htmlFor="coupon-code">Promo Code Name</label>
              <input
                id="coupon-code"
                type="text"
                className="form-control"
                placeholder="e.g. 25OFF, VIPKIGALI"
                value={newCoupon.code}
                onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value })}
                disabled={actionLoading}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="coupon-percent">Discount Percentage (%)</label>
              <input
                id="coupon-percent"
                type="number"
                min="1"
                max="100"
                className="form-control"
                placeholder="e.g. 25"
                value={newCoupon.discount_percent}
                onChange={(e) => setNewCoupon({ ...newCoupon, discount_percent: e.target.value })}
                disabled={actionLoading}
              />
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '10px' }}
              disabled={actionLoading}
            >
              {actionLoading ? 'Creating Promo...' : 'Create Coupon Code'}
            </button>
          </form>
        </div>

        {/* Informative tips */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h2 className="card-title" style={{ color: 'var(--primary-color)' }}>Promotion Mechanics</h2>
          <p style={{ lineHeight: '1.6', margin: '0 0 15px 0' }}>
            Promo coupons are dynamically validated by your gym managers during member registrations. 
            When applied, the coupon dynamically reduces the final signup price based on the configured percent.
          </p>
          <ul style={{ paddingLeft: '20px', lineHeight: '1.8', margin: 0, color: 'var(--text-secondary)' }}>
            <li>Codes are automatically converted to **UPPERCASE** and trimmed of whitespace.</li>
            <li>Coupons must have a percentage deduction between 1% and 100%.</li>
            <li>Only **Active** coupons will be accepted during client registrations.</li>
          </ul>
        </div>
      </div>

      {/* Coupons List Table */}
      <div className="card">
        <h2 className="card-title">Active Gym Promo Directory</h2>
        {coupons.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px 0' }}>
            No promo coupon codes created yet. Use the form above to add your first promotion.
          </p>
        ) : (
          <Table 
            columns={[
              {
                title: 'Promo Code',
                dataIndex: 'code',
                key: 'code',
                fixed: 'left',
                width: 150,
                render: text => <code>{text}</code>
              },
              {
                title: 'Discount Percent',
                dataIndex: 'discount_percent',
                key: 'discount_percent',
                width: 150,
                render: text => <span style={{ fontWeight: '600' }}>{text}% OFF</span>
              },
              {
                title: 'Deduction Example (40k plan)',
                key: 'deduction',
                width: 250,
                render: (_, cp) => {
                  const sampleDeduction = Math.round(40000 * (cp.discount_percent / 100));
                  const sampleFinal = 40000 - sampleDeduction;
                  return (
                    <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                      40,000 → <span style={{ color: 'var(--success-color)', fontWeight: 'bold' }}>{sampleFinal.toLocaleString()} RWF</span>
                    </span>
                  );
                }
              },
              {
                title: 'Status',
                key: 'status',
                width: 120,
                render: (_, cp) => (
                  <span 
                    className={`status-badge ${cp.active === 1 ? 'badge-active' : 'badge-inactive'}`}
                    style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      backgroundColor: cp.active === 1 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: cp.active === 1 ? 'var(--success-color)' : 'var(--danger-color)'
                    }}
                  >
                    {cp.active === 1 ? 'Active' : 'Inactive'}
                  </span>
                )
              },
              {
                title: 'Actions',
                key: 'actions',
                width: 200,
                align: 'right',
                render: (_, cp) => (
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      className={`btn ${cp.active === 1 ? 'btn-secondary' : 'btn-primary'}`}
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => handleToggleCoupon(cp)}
                      disabled={actionLoading}
                    >
                      {cp.active === 1 ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      className="btn btn-danger"
                      style={{ 
                        padding: '6px 12px', 
                        fontSize: '12px',
                        backgroundColor: '#ef4444',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleDeleteCoupon(cp)}
                      disabled={actionLoading}
                    >
                      Delete
                    </button>
                  </div>
                )
              }
            ]}
            dataSource={coupons.map((cp, i) => ({ ...cp, key: cp.id || i }))}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 'max-content' }}
            size="middle"
          />
        )}
      </div>

    </div>
  );
}
