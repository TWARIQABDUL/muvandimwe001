import React from 'react';
import { Table } from 'antd';

export default function OwnerCheckins({ data }) {
  const reports = data?.dashboard?.reports;

  const newSubscribersColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name', fixed: 'left', width: 150, render: text => <strong>{text}</strong> },
    { title: 'Dynamic Package', dataIndex: 'plan', key: 'plan', width: 150 },
    { title: 'Monthly Fee', dataIndex: 'monthly_fee', key: 'monthly_fee', width: 120, render: text => `${Number(text).toLocaleString()} RWF` },
    { title: 'Date', dataIndex: 'start_date', key: 'start_date', width: 120 }
  ];

  const oldCheckedInColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name', fixed: 'left', width: 150, render: text => <strong>{text}</strong> },
    { title: 'Service', dataIndex: 'service', key: 'service', width: 120, render: text => <span style={{ textTransform: 'capitalize' }}>{text}</span> },
    { title: 'Dynamic Package', dataIndex: 'plan', key: 'plan', width: 150 },
    { title: 'Timestamp', dataIndex: 'timestamp', key: 'timestamp', width: 120, render: text => new Date(text).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ];

  return (
    <div className="checkins-tab">
      <div className="card">
        <h2 className="card-title">Recent Check-in Activity</h2>
        <div className="grid grid-2">
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '10px' }}>New Subscriber Sign-ups</h3>
            {reports?.new_subscribers?.length ? (
              <Table 
                columns={newSubscribersColumns}
                dataSource={reports.new_subscribers.map((s, i) => ({ ...s, key: i }))}
                pagination={{ pageSize: 5 }}
                scroll={{ x: 'max-content' }}
                size="small"
              />
            ) : (
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No new subscribers signed up in this timeframe.</p>
            )}
          </div>

          <div>
            <h3 style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '10px' }}>Existing Subscriber Check-ins</h3>
            {reports?.old_checked_in?.length ? (
              <Table 
                columns={oldCheckedInColumns}
                dataSource={reports.old_checked_in.map((s, i) => ({ ...s, key: i }))}
                pagination={{ pageSize: 5 }}
                scroll={{ x: 'max-content' }}
                size="small"
              />
            ) : (
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No existing subscribers checked in in this timeframe.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
