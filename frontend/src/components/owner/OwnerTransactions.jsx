import React, { useState, useEffect } from 'react';
import { Table } from 'antd';
import { api } from '../../store/authStore.js';
import { useRefresh } from '../../hooks/useRefresh.jsx';

const today = () => new Date().toISOString().split('T')[0];

const dupBadge = (
  <span style={{ marginLeft: 6, padding: '2px 6px', borderRadius: 10, fontSize: 11, fontWeight: 'bold', background: 'rgba(245, 158, 11, 0.15)', color: '#b45309' }}>
    Possible duplicate
  </span>
);

const deleteBtnStyle = { padding: '6px 12px', fontSize: '12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' };

export default function OwnerTransactions({ setError, setMessage }) {
  const { refreshKey } = useRefresh();
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [checkins, setCheckins] = useState([]);
  const [payments, setPayments] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    load();
  }, [refreshKey, from, to]);

  const load = async () => {
    try {
      setLoading(true);
      const [c, p, s] = await Promise.all([
        api.get('/transactions/checkins', { params: { from, to } }),
        api.get('/transactions/payments', { params: { from, to } }),
        api.get('/transactions/sales', { params: { from, to } })
      ]);
      setCheckins(c.data.checkins || []);
      setPayments(p.data.payments || []);
      setSales(s.data.sales || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (kind, row, label) => {
    if (!window.confirm(`Delete ${label}? This takes effect immediately and cannot be undone.`)) return;
    setError(null);
    setMessage(null);
    try {
      setBusy(true);
      const res = await api.delete(kind === 'sales' ? `/products/sales/${row.id}` : `/transactions/${kind}/${row.id}`);
      setMessage(res.data.message || 'Removed.');
      load();
      setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete');
      setTimeout(() => setError(null), 4000);
    } finally {
      setBusy(false);
    }
  };

  const time = (t) => new Date(t).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const rowClass = (r) => (r.possible_duplicate ? 'row-possible-duplicate' : '');

  const checkinColumns = [
    { title: 'Name', dataIndex: 'member_name', key: 'name', fixed: 'left', width: 200, render: (t, r) => <><strong>{t}</strong>{r.possible_duplicate && dupBadge}</> },
    { title: 'Service', dataIndex: 'service', key: 'service', render: t => <span style={{ textTransform: 'capitalize' }}>{t}</span> },
    { title: 'Type', dataIndex: 'type', key: 'type' },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: t => (t ? `${Number(t).toLocaleString()} RWF` : '-') },
    { title: 'Time', dataIndex: 'timestamp', key: 'time', render: time },
    { title: 'Recorded by', dataIndex: 'recorded_by', key: 'by', render: t => t || '-' },
    {
      title: '', key: 'actions', align: 'right',
      render: (_, r) => (
        <button style={deleteBtnStyle} disabled={busy} onClick={() => remove('checkins', r, `the ${r.service} check-in for ${r.member_name}`)}>
          Delete
        </button>
      )
    }
  ];

  const paymentColumns = [
    { title: 'Member', dataIndex: 'member_name', key: 'name', fixed: 'left', width: 200, render: (t, r) => <><strong>{t || 'Walk-in'}</strong>{r.possible_duplicate && dupBadge}</> },
    { title: 'Type', dataIndex: 'type', key: 'type', render: t => t.replace(/_/g, ' ') },
    { title: 'Service', dataIndex: 'service', key: 'service', render: t => <span style={{ textTransform: 'capitalize' }}>{t}</span> },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: t => `${Number(t).toLocaleString()} RWF` },
    { title: 'Method', dataIndex: 'payment_method', key: 'method' },
    { title: 'Time', dataIndex: 'timestamp', key: 'time', render: time },
    { title: 'Recorded by', dataIndex: 'recorded_by', key: 'by', render: t => t || '-' },
    {
      title: '', key: 'actions', align: 'right',
      render: (_, r) => (
        <button style={deleteBtnStyle} disabled={busy} onClick={() => remove('payments', r, `the ${Number(r.amount).toLocaleString()} RWF payment${r.member_name ? ` from ${r.member_name}` : ''}`)}>
          Delete
        </button>
      )
    }
  ];

  const saleColumns = [
    { title: 'Item', dataIndex: 'product_name', key: 'name', fixed: 'left', width: 200, render: (t, r) => <><strong style={{ textTransform: 'capitalize' }}>{t}</strong>{r.possible_duplicate && dupBadge}</> },
    { title: 'Qty', dataIndex: 'quantity', key: 'qty' },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: t => `${Number(t).toLocaleString()} RWF` },
    { title: 'Method', dataIndex: 'payment_method', key: 'method' },
    { title: 'Time', dataIndex: 'timestamp', key: 'time', render: time },
    { title: 'Recorded by', dataIndex: 'recorded_by', key: 'by', render: t => t || '-' },
    {
      title: '', key: 'actions', align: 'right',
      render: (_, r) => (
        <button style={deleteBtnStyle} disabled={busy} onClick={() => remove('sales', r, `the ${r.quantity} x ${r.product_name} sale (${Number(r.amount).toLocaleString()} RWF)`)}>
          Delete
        </button>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div className="card">
        <h2 className="card-title">Review Transactions</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: 0 }}>
          Find a check-in, payment or shop sale staff entered twice and delete it. Deleting a card check-in gives the tap back;
          deleting a renewal payment moves the renewal date back; deleting a walk-in check-in removes its payment too.
          Every deletion is written to the Activity Log.
        </p>
        <div style={{ display: 'flex', gap: 15, flexWrap: 'wrap' }}>
          <div className="form-group">
            <label htmlFor="tx-from">From</label>
            <input id="tx-from" type="date" className="form-control" value={from} max={to} onChange={e => setFrom(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="tx-to">To</label>
            <input id="tx-to" type="date" className="form-control" value={to} min={from} onChange={e => setTo(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Check-ins ({checkins.length})</h2>
        <Table columns={checkinColumns} dataSource={checkins.map(c => ({ ...c, key: c.id }))} loading={loading}
          rowClassName={rowClass} pagination={{ pageSize: 10 }} scroll={{ x: 'max-content' }} size="small" />
      </div>

      <div className="card">
        <h2 className="card-title">Payments ({payments.length})</h2>
        <Table columns={paymentColumns} dataSource={payments.map(p => ({ ...p, key: p.id }))} loading={loading}
          rowClassName={rowClass} pagination={{ pageSize: 10 }} scroll={{ x: 'max-content' }} size="small" />
      </div>

      <div className="card">
        <h2 className="card-title">Shop Sales ({sales.length})</h2>
        <Table columns={saleColumns} dataSource={sales.map(x => ({ ...x, key: x.id }))} loading={loading}
          rowClassName={rowClass} pagination={{ pageSize: 10 }} scroll={{ x: 'max-content' }} size="small" />
      </div>
    </div>
  );
}
