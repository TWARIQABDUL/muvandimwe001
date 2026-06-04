import React from 'react';
import { Table } from 'antd';

export default function PendingRenewals({ dashboardData, handleRenewal, paymentMethod, setPaymentMethod, loading }) {
  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', fixed: 'left', width: 150, render: text => <strong>{text}</strong> },
    { title: 'Plan', dataIndex: 'subscription', key: 'subscription', width: 150 },
    { title: 'Due Date', dataIndex: 'next_renewal_date', key: 'next_renewal_date', width: 120, render: text => <span style={{ color: 'var(--danger-color)', fontWeight: '600' }}>{text}</span> },
    { title: 'Action', key: 'action', width: 150, render: (_, item) => (
        <button
          className="btn-primary btn-small"
          onClick={() => handleRenewal(item.id)}
          disabled={loading}
        >
          Renew Subscription
        </button>
      )
    }
  ];

  return (
    <div className="renewals-tab">
      <div className="card">
        <div className="flex-between" style={{ marginBottom: '20px' }}>
          <h2 className="card-title" style={{ margin: 0 }}>Pending Renewals</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: '#f8fafc', padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontWeight: '600' }}>Payment Method:</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input 
                type="radio" 
                name="renewalPaymentMethod" 
                value="Cash" 
                checked={paymentMethod === 'Cash'} 
                onChange={(e) => setPaymentMethod(e.target.value)} 
              />
              Cash
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input 
                type="radio" 
                name="renewalPaymentMethod" 
                value="MOMO" 
                checked={paymentMethod === 'MOMO'} 
                onChange={(e) => setPaymentMethod(e.target.value)} 
              />
              MOMO
            </label>
          </div>
        </div>
        {dashboardData?.pending_renewals?.length ? (
          <Table 
            columns={columns}
            dataSource={dashboardData.pending_renewals.map(item => ({ ...item, key: item.id }))}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 'max-content' }}
            size="middle"
          />
        ) : (
          <div className="text-center" style={{ padding: '40px', color: 'var(--text-secondary)' }}>
            No renewals pending for today. Everyone is up to date!
          </div>
        )}
      </div>
    </div>
  );
}
