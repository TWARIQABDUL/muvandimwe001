import React, { useState } from 'react';
import { Table } from 'antd';
import { api } from '../../store/authStore.js';

const when = (t) => new Date(t).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const day = (t) => (t ? new Date(t).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) : '-');
const cap = { textTransform: 'capitalize' };

export default function OwnerMemberHistory({ setError }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(false);

  const search = async (e) => {
    e.preventDefault();
    setError(null);
    setHistory(null);
    try {
      setLoading(true);
      const res = await api.get('/transactions/members/search', { params: { q: query } });
      setResults(res.data.members || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Search failed');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const open = async (id) => {
    setError(null);
    try {
      setLoading(true);
      const res = await api.get(`/transactions/members/${id}/history`);
      setHistory(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load history');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const checkinColumns = [
    { title: 'Time', dataIndex: 'timestamp', key: 'time', fixed: 'left', width: 190, render: when },
    { title: 'Service', dataIndex: 'service', key: 'service', render: t => <span style={cap}>{t}</span> },
    { title: 'Type', dataIndex: 'type', key: 'type' },
    { title: 'Paid', dataIndex: 'amount', key: 'amount', render: t => (t ? `${Number(t).toLocaleString()} RWF` : '-') },
    { title: 'Recorded by', dataIndex: 'recorded_by', key: 'by', render: t => t || '-' }
  ];

  const paymentColumns = [
    { title: 'Time', dataIndex: 'timestamp', key: 'time', fixed: 'left', width: 190, render: when },
    { title: 'Type', dataIndex: 'type', key: 'type', render: t => t.replace(/_/g, ' ') },
    { title: 'Service', dataIndex: 'service', key: 'service', render: t => <span style={cap}>{t}</span> },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: t => `${Number(t).toLocaleString()} RWF` },
    { title: 'Method', dataIndex: 'payment_method', key: 'method' },
    { title: 'Months', dataIndex: 'months', key: 'months', render: t => t || '-' },
    { title: 'Recorded by', dataIndex: 'recorded_by', key: 'by', render: t => t || '-' }
  ];

  const activityColumns = [
    { title: 'Time', dataIndex: 'created_at', key: 'time', fixed: 'left', width: 190, render: when },
    { title: 'Who', key: 'who', render: (_, a) => a.username || 'unknown' },
    { title: 'Action', dataIndex: 'action', key: 'action' }
  ];

  const m = history?.member;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div className="card">
        <h2 className="card-title">Member History</h2>
        <form onSubmit={search} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input className="form-control" style={{ flex: 1, minWidth: 220 }} placeholder="Search by name or phone"
            value={query} onChange={e => setQuery(e.target.value)} />
          <button type="submit" className="btn btn-primary" disabled={loading || query.trim().length < 2}>Search</button>
        </form>

        {results && !history && (
          results.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', marginBottom: 0 }}>No member found.</p>
          ) : (
            <div style={{ marginTop: 15, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {results.map(r => (
                <div key={r.id} onClick={() => open(r.id)}
                  style={{ padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: 6, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <strong>{r.name}</strong>
                  <span style={{ color: 'var(--text-secondary)' }}>{[r.phone, r.gym_name].filter(Boolean).join(' · ')}</span>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {m && (
        <>
          <div className="card">
            <div className="flex-between" style={{ flexWrap: 'wrap', gap: 10 }}>
              <h2 className="card-title" style={{ margin: 0 }}>{m.name}</h2>
              <button className="btn btn-secondary" onClick={() => setHistory(null)}>Back to results</button>
            </div>
            <p style={{ color: 'var(--text-secondary)' }}>
              {[m.phone, m.email, m.gym_name].filter(Boolean).join(' · ') || 'No contact details'} · Registered {day(m.created_at)}
            </p>
            <div className="grid grid-4">
              <div><strong>{m.plan || 'No plan'}</strong><div style={{ color: 'var(--text-secondary)' }}>Plan</div></div>
              <div><strong style={cap}>{m.status || '-'}</strong><div style={{ color: 'var(--text-secondary)' }}>Status</div></div>
              <div><strong>{day(m.start_date)} → {day(m.next_renewal_date)}</strong><div style={{ color: 'var(--text-secondary)' }}>Start → Renewal</div></div>
              <div><strong>{history.totals.checkins} visits · {history.totals.paid.toLocaleString()} RWF</strong><div style={{ color: 'var(--text-secondary)' }}>Total</div></div>
            </div>
          </div>

          <div className="card">
            <h2 className="card-title">Check-ins ({history.checkins.length})</h2>
            <Table columns={checkinColumns} dataSource={history.checkins.map(c => ({ ...c, key: c.id }))}
              pagination={{ pageSize: 10 }} scroll={{ x: 'max-content' }} size="small" />
          </div>

          <div className="card">
            <h2 className="card-title">Payments ({history.payments.length})</h2>
            <Table columns={paymentColumns} dataSource={history.payments.map(p => ({ ...p, key: p.id }))}
              pagination={{ pageSize: 10 }} scroll={{ x: 'max-content' }} size="small" />
          </div>

          <div className="card">
            <h2 className="card-title">Activity Log entries ({history.activity.length})</h2>
            <Table columns={activityColumns} dataSource={history.activity.map(a => ({ ...a, key: a.id }))}
              pagination={{ pageSize: 10 }} scroll={{ x: 'max-content' }} size="small" />
          </div>
        </>
      )}
    </div>
  );
}
