import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../store/authStore.js';
import { useRefresh } from '../../hooks/useRefresh.jsx';

const ALL = '__all__';

const money = (value) => `${Math.round(Number(value) || 0).toLocaleString()} RWF`;

const capitalise = (value) => {
  const text = String(value || '').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
};

const clockTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// How each kind of visit is labelled in the people list.
const KINDS = [
  { key: 'daily', field: 'daily', label: 'Daily', badge: 'warning' },
  { key: 'old', field: 'old', label: 'Subscriber', badge: 'primary' },
  { key: 'vip', field: 'vip', label: 'VIP', badge: 'success' },
  { key: 'new', field: 'new_subscriptions', label: 'New', badge: 'primary' },
  { key: 'renewal', field: 'renewals', label: 'Renewal', badge: 'primary' }
];

export default function OwnerDailyReport() {
  const { refreshKey } = useRefresh();
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [service, setService] = useState(ALL);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/dashboard/daily-report?date=${date}`);
      setReport(response.data.report);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load the report');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport, refreshKey]);

  const shiftDate = (days) => {
    const d = new Date(`${date}T00:00:00`);
    d.setDate(d.getDate() + days);
    const next = d.toISOString().split('T')[0];
    if (next <= today) setDate(next);
  };

  // Every visit and payment of the day, flattened out of the report's sections.
  const everyone = useMemo(() => {
    const rows = [];
    (report?.sections || []).forEach(section => {
      KINDS.forEach(kind => {
        (section[kind.field] || []).forEach(entry => {
          rows.push({
            name: entry.name || 'Walk-in',
            service: entry.service,
            section: section.category,
            kind: kind.key,
            kindLabel: kind.label,
            badge: kind.badge,
            amount: Number(entry.amount) || 0,
            employer: entry.employer || null,
            months: entry.months || null,
            time: entry.time || null
          });
        });
      });
    });
    return rows.sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
  }, [report]);

  const servicesUsed = useMemo(
    () => [...new Set(everyone.map(r => r.service))].sort(),
    [everyone]
  );

  const shown = useMemo(
    () => (service === ALL ? everyone : everyone.filter(r => r.service === service)),
    [everyone, service]
  );

  // Keep the filter valid when the day changes to one without that service.
  useEffect(() => {
    if (service !== ALL && !servicesUsed.includes(service)) setService(ALL);
  }, [servicesUsed, service]);

  const revenue = shown.reduce((sum, r) => sum + r.amount, 0);
  const countOf = (kind) => shown.filter(r => r.kind === kind).length;

  const products = report?.products || [];
  const showProducts = service === ALL && products.length > 0;
  const productTotal = products.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" className="btn-secondary" onClick={() => shiftDate(-1)}>&lt;</button>
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
          />
          <button type="button" className="btn-secondary" onClick={() => shiftDate(1)} disabled={date >= today}>&gt;</button>
          {date !== today && (
            <button type="button" className="btn-secondary" onClick={() => setDate(today)}>Today</button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="card text-center" style={{ padding: '60px 20px' }}>
          <div className="spinner"></div>
          <p style={{ marginTop: '10px' }}>Loading...</p>
        </div>
      ) : everyone.length === 0 && products.length === 0 ? (
        <div className="card text-center" style={{ padding: '50px 20px', color: 'var(--text-secondary)' }}>
          Nobody came in on {report?.display_date || date}.
        </div>
      ) : (
        <>
          {servicesUsed.length > 0 && (
            <div className="card">
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                Filter by service
              </div>
              {/* A gym with a dozen services would wrap into a wall of chips,
                  so the row scrolls sideways instead. */}
              <div className="filter-chips">
                <button
                  type="button"
                  className={service === ALL ? 'btn-primary btn-small' : 'btn-secondary btn-small'}
                  onClick={() => setService(ALL)}
                >
                  All services ({everyone.length})
                </button>
                {servicesUsed.map(name => (
                  <button
                    key={name}
                    type="button"
                    className={service === name ? 'btn-primary btn-small' : 'btn-secondary btn-small'}
                    onClick={() => setService(name)}
                  >
                    {capitalise(name)} ({everyone.filter(r => r.service === name).length})
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-3">
            <div className="card">
              <div style={{ fontSize: '26px', fontWeight: 700 }}>{shown.length}</div>
              <div style={{ color: 'var(--text-secondary)' }}>
                {service === ALL ? 'People served' : `${capitalise(service)} visits`}
              </div>
            </div>
            <div className="card">
              <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--success-color)' }}>{money(revenue)}</div>
              <div style={{ color: 'var(--text-secondary)' }}>Collected</div>
            </div>
            <div className="card">
              <div style={{ fontSize: '26px', fontWeight: 700 }}>
                {money(Number(report?.totals?.grand_total) || 0)}
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>
                Whole day, incl. shop
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', gap: '25px', flexWrap: 'wrap' }}>
              {KINDS.map(kind => (
                <div key={kind.key}>
                  <div style={{ fontSize: '20px', fontWeight: 700 }}>{countOf(kind.key)}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{kind.label}</div>
                </div>
              ))}
            </div>
          </div>

          {showProducts && (
            <div className="card">
              <h2 className="card-title">Shop ({money(productTotal)})</h2>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '14px' }}>
                {products.map(p => (
                  <span key={p.name}>
                    {capitalise(p.name)}: <strong>{p.quantity}</strong> = {money(p.amount)}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="card" style={{ overflowX: 'auto' }}>
            <h2 className="card-title">
              Who came in{service === ALL ? '' : ` for ${capitalise(service)}`} ({shown.length})
            </h2>
            {shown.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Nobody used this service on this date.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border-color)' }}>
                    <th style={{ padding: '10px 6px' }}>Name</th>
                    <th style={{ padding: '10px 6px' }}>Service</th>
                    <th style={{ padding: '10px 6px' }}>Type</th>
                    <th style={{ padding: '10px 6px' }}>Paid</th>
                    <th style={{ padding: '10px 6px' }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '10px 6px', fontWeight: 600 }}>
                        {row.name}
                        {row.employer && (
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}> ({row.employer.toUpperCase()})</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 6px' }}>{capitalise(row.service)}</td>
                      <td style={{ padding: '10px 6px' }}>
                        <span className={`badge badge-${row.badge}`}>{row.kindLabel}</span>
                        {row.months ? (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}> {row.months}mo</span>
                        ) : null}
                      </td>
                      <td style={{ padding: '10px 6px' }}>{row.amount > 0 ? money(row.amount) : '-'}</td>
                      <td style={{ padding: '10px 6px', color: 'var(--text-secondary)' }}>{clockTime(row.time)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
