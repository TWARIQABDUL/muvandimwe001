import React from 'react';
import { Table } from 'antd';

const formatDateWithDays = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date)) return dateString;

  const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let daysText = '';
  if (diffDays === 0) {
    daysText = '(Today)';
  } else if (diffDays === 1) {
    daysText = '(Tomorrow)';
  } else if (diffDays === -1) {
    daysText = '(Yesterday)';
  } else if (diffDays > 1) {
    daysText = `(in ${diffDays} days)`;
  } else {
    daysText = `(${Math.abs(diffDays)} days ago)`;
  }

  return `${formattedDate} ${daysText}`;
};

export default function OwnerMembers({ activeMembers }) {
  const columns = [
    {
      title: 'Member Name',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
      width: 150,
      render: text => <strong>{text}</strong>
    },
    {
      title: 'Contact Details',
      key: 'contact',
      width: 200,
      render: (_, member) => (
        <div style={{ fontSize: '13px' }}>
          <div>{member.email || 'No Email'}</div>
          <div style={{ color: 'var(--text-secondary)' }}>{member.phone || 'No Phone'}</div>
        </div>
      )
    },
    {
      title: 'Dynamic Package Plan',
      dataIndex: 'subscription_name',
      key: 'subscription_name',
      width: 180
    },
    {
      title: 'Subscription Status',
      key: 'status',
      width: 300,
      render: (_, member) => member.is_card === 1 ? (
        <span className="badge badge-success" style={{ backgroundColor: '#e0f2fe', color: '#0369a1' }}>
          🎫 Session Card: {member.remaining_taps} Taps Left (Exp: {formatDateWithDays(member.next_renewal_date)})
        </span>
      ) : (
        <span className="badge badge-success">
          📅 Monthly (Renewal: {formatDateWithDays(member.next_renewal_date)})
        </span>
      )
    }
  ];

  return (
    <div className="members-tab">
      <div className="card">
        <h2 className="card-title">Detailed Members List</h2>
        {activeMembers?.members_list?.length ? (
          <>
            <div className="flex-between" style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
              <span><strong>Total Active:</strong> {activeMembers.total_active} members</span>
              <span><strong>Est. MRR:</strong> {activeMembers.estimated_mrr.toLocaleString()} RWF</span>
            </div>
            <Table 
              columns={columns}
              dataSource={activeMembers.members_list.map((m, i) => ({ ...m, key: m.id || i }))}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 'max-content' }}
              size="middle"
            />
          </>
        ) : (
          <p style={{ color: 'var(--text-secondary)' }}>Active membership details are not available yet.</p>
        )}
      </div>
    </div>
  );
}
