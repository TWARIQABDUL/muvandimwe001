import React from 'react';
import { Table } from 'antd';

export default function SubscriberActivity({ dashboardData }) {
  const newSubscribersColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name', fixed: 'left', width: 150, render: text => <strong>{text}</strong> },
    { title: 'Dynamic Plan', dataIndex: 'plan', key: 'plan', width: 150 },
    { title: 'Fee', dataIndex: 'monthly_fee', key: 'monthly_fee', width: 120, render: text => <span style={{ color: 'var(--success-color)', fontWeight: '600' }}>{Number(text).toLocaleString()} RWF</span> }
  ];

  const oldCheckedInColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name', fixed: 'left', width: 150, render: text => <strong>{text}</strong> },
    { title: 'Service Checked In', dataIndex: 'service', key: 'service', width: 150, render: text => <span style={{ textTransform: 'capitalize' }}>{text}</span> },
    { title: 'Dynamic Plan', dataIndex: 'plan', key: 'plan', width: 150 },
    { title: 'Time', dataIndex: 'timestamp', key: 'timestamp', width: 120, render: text => new Date(text).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ];

  return (
    <div className="activity-tab">
      <div className="card">
        <h2 className="card-title">Subscriber Activity Reports</h2>
        
        <div className="grid grid-2">
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '12px' }}>New Subscribers Registered Today</h3>
            {dashboardData?.reports?.new_subscribers?.length ? (
              <Table 
                columns={newSubscribersColumns}
                dataSource={dashboardData.reports.new_subscribers.map((s, i) => ({ ...s, key: i }))}
                pagination={{ pageSize: 5 }}
                scroll={{ x: 'max-content' }}
                size="small"
              />
            ) : (
              <div className="text-center" style={{ padding: '20px', background: 'var(--bg-light)', borderRadius: '8px' }}>
                <p style={{ color: 'var(--text-secondary)' }}>No new subscribers today.</p>
              </div>
            )}
          </div>

          <div>
            <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '12px' }}>Existing Subscriber Check-Ins Today</h3>
          {dashboardData?.reports?.old_checked_in?.length ? (
            <Table 
              columns={oldCheckedInColumns}
              dataSource={dashboardData.reports.old_checked_in.map((s, i) => ({ ...s, key: i }))}
              pagination={{ pageSize: 5 }}
              scroll={{ x: 'max-content' }}
              size="small"
            />
          ) : (
            <div className="text-center" style={{ padding: '20px', background: 'var(--bg-light)', borderRadius: '8px' }}>
              <p style={{ color: 'var(--text-secondary)' }}>No existing subscribers checked in today.</p>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
