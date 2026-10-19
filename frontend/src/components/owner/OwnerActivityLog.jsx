import React, { useState, useEffect } from 'react';
import { Table } from 'antd';
import { api } from '../../store/authStore.js';
import { useRefresh } from '../../hooks/useRefresh.jsx';

const today = () => new Date().toISOString().split('T')[0];

const LABELS = {
  'auth.login': 'Signed in',
  'checkin.create': 'Recorded a check-in',
  'checkin.delete': 'Deleted a check-in',
  'payment.renewal': 'Recorded a renewal payment',
  'payment.delete': 'Deleted a payment',
  'member.register': 'Registered a member',
  'sale.create': 'Recorded a shop sale',
  'sale.delete': 'Deleted a shop sale',
  'staff.create': 'Added a staff member',
  'staff.delete': 'Removed a staff member'
};

const isDelete = (a) => a.endsWith('.delete') || a.startsWith('DELETE ');

function summarize(d) {
  if (!d) return '';
  return Object.entries(d)
    .filter(([, v]) => v !== null && v !== '' && !(Array.isArray(v) && v.length === 0))
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${Array.isArray(v) ? v.join('; ') : v}`)
    .join(' · ');
}

export default function OwnerActivityLog({ setError }) {
  const { refreshKey } = useRefresh();
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await api.get('/transactions/audit-logs', { params: { from, to } });
        setLogs(res.data.logs || []);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load activity log');
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshKey, from, to]);

  const columns = [
    { title: 'Time', dataIndex: 'created_at', key: 'time', fixed: 'left', width: 170, render: t => new Date(t).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) },
    { title: 'Who', key: 'who', width: 150, render: (_, l) => <><strong>{l.username || 'unknown'}</strong>{l.role && <span style={{ color: 'var(--text-secondary)' }}> ({l.role})</span>}</> },
    { title: 'Action', dataIndex: 'action', key: 'action', width: 220, render: a => <span style={{ color: isDelete(a) ? '#ef4444' : undefined, fontWeight: isDelete(a) ? 600 : 400 }}>{LABELS[a] || a}</span> },
    { title: 'Details', dataIndex: 'details', key: 'details', render: d => <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{summarize(d)}</span> }
  ];

  return (
    <div className="card">
      <h2 className="card-title">Activity Log</h2>
      <p style={{ color: 'var(--text-secondary)', marginTop: 0 }}>Every action in the system, who did it, and when. Showing up to the latest 500 for the dates chosen.</p>
      <div style={{ display: 'flex', gap: 15, flexWrap: 'wrap', marginBottom: 15 }}>
        <div className="form-group">
          <label htmlFor="log-from">From</label>
          <input id="log-from" type="date" className="form-control" value={from} max={to} onChange={e => setFrom(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="log-to">To</label>
          <input id="log-to" type="date" className="form-control" value={to} min={from} onChange={e => setTo(e.target.value)} />
        </div>
      </div>
      <Table columns={columns} dataSource={logs.map(l => ({ ...l, key: l.id }))} loading={loading}
        pagination={{ pageSize: 15 }} scroll={{ x: 'max-content' }} size="small" />
    </div>
  );
}
