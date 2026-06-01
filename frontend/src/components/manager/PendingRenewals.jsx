import React from 'react';
import { Table } from 'antd';

export default function PendingRenewals({ dashboardData, handleRenewal, loading }) {
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
        <h2 className="card-title">Pending Renewals</h2>
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
