import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from '../../store/authStore.js';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function OwnerAnalytics({ data, timeframe, setTimeframe, trendData }) {
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      setReportLoading(true);
      try {
        const response = await api.get(`/dashboard/report?date=${reportDate}`);
        setReportData(response.data.data);
      } catch (err) {
        console.error("Failed to fetch report:", err);
      } finally {
        setReportLoading(false);
      }
    };
    fetchReport();
  }, [reportDate]);

  const dashboardData = data?.dashboard;

  if (!dashboardData) {
    return <p>Analyzing business metrics...</p>;
  }

  const pieData = Object.entries(dashboardData.revenue_breakdown || {})
    .map(([service, breakdown]) => ({
      name: service,
      value: breakdown.total || 0
    }))
    .filter(item => item.value > 0);

  return (
    <div className="analytics-tab">
      <div className="card">
        <div className="flex-between">
          <h2 className="card-title" style={{ margin: 0 }}>Snapshot Period</h2>
          <div className="timeframe-buttons" style={{ display: 'flex', gap: '8px' }}>
            {['today', 'week', 'month', 'year'].map(tf => (
              <button
                key={tf}
                className={`btn-timeframe ${timeframe === tf ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setTimeframe(tf)}
              >
                {tf.charAt(0).toUpperCase() + tf.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
        <div className="card">
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{dashboardData.snapshot.total_checkins}</div>
          <div style={{ color: 'var(--text-secondary)' }}>Total People Entered</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{dashboardData.snapshot.walk_in_checkins}</div>
          <div style={{ color: 'var(--text-secondary)' }}>Total Walkins</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {dashboardData.snapshot.partner_checkins !== undefined 
              ? dashboardData.snapshot.subscriber_checkins
              : Math.max(0, dashboardData.snapshot.subscriber_checkins - (dashboardData.recent_checkins || []).filter(c => c.type === 'b2b').length)}
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>Subscribers</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {dashboardData.snapshot.partner_checkins !== undefined 
              ? dashboardData.snapshot.partner_checkins 
              : (dashboardData.recent_checkins || []).filter(c => c.type === 'b2b').length}
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>Partners Subscribers</div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: '20px' }}>
        <div className="card">
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{dashboardData.snapshot.active_subscriptions}</div>
          <div style={{ color: 'var(--text-secondary)' }}>Active Members</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary-color)' }}>
            {Number(dashboardData.snapshot.estimated_mrr).toLocaleString()} RWF
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>Estimated MRR</div>
        </div>
      </div>

      <div className="grid grid-3" style={{ marginBottom: '20px' }}>
        <div className="card" style={{ borderLeft: '4px solid var(--warning-color)' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--warning-color)' }}>
            {(dashboardData.snapshot.walk_in_revenue || 0).toLocaleString()} RWF
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>Walk-in Cash (At Door)</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid var(--primary-color)' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary-color)' }}>
            {(dashboardData.snapshot.subscription_revenue || 0).toLocaleString()} RWF
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>New Abonment</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid var(--success-color)' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success-color)' }}>
            {(dashboardData.snapshot.total_revenue || 0).toLocaleString()} RWF
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>Total Cash Collected</div>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div className="card">
          <h2 className="card-title">Revenue Breakdown by Service</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {pieData.length > 0 && (
              <div style={{ height: '250px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value.toLocaleString()} RWF`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <table>
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Walk-in</th>
                  <th>Daily</th>
                  <th>Subscription</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(dashboardData.revenue_breakdown || {}).map(([service, breakdown]) => (
                  <tr key={service}>
                    <td style={{ textTransform: 'capitalize', fontWeight: '600' }}>{service}</td>
                    <td>{(breakdown.walk_in || 0).toLocaleString()}</td>
                    <td>{(breakdown.daily || 0).toLocaleString()}</td>
                    <td>{(breakdown.subscription || 0).toLocaleString()}</td>
                    <td style={{ fontWeight: '700', color: 'var(--primary-color)' }}>
                      {(breakdown.total || 0).toLocaleString()} RWF
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
        
      <div className="grid grid-2">
        <div className="card">
          <h2 className="card-title">Recent Check-ins</h2>
          {dashboardData.recent_checkins && dashboardData.recent_checkins.length ? (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Service</th>
                    <th>Type</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.recent_checkins.map((c, i) => (
                    <tr key={i}>
                      <td>{c.member_name}</td>
                      <td style={{ textTransform: 'capitalize' }}>{c.service}</td>
                      <td>
                        <span className={`badge badge-${c.type === 'walk_in' ? 'warning' : c.type === 'b2b' ? 'success' : 'primary'}`}>
                          {c.type === 'walk_in' ? 'Walk-in' : c.type === 'b2b' ? 'Partner' : 'Subscriber'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{c.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>No check-ins for this period yet.</p>
          )}
        </div>
        
        <div className="card">
          <div className="flex-between" style={{ marginBottom: '15px' }}>
            <h2 className="card-title" style={{ margin: 0 }}>Daily Check-ins Report</h2>
            <input 
              type="date" 
              value={reportDate} 
              onChange={e => setReportDate(e.target.value)} 
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
            />
          </div>
          
          {reportLoading ? (
            <p>Loading report data...</p>
          ) : reportData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '400px', overflowY: 'auto' }}>
              <div>
                <h3 style={{ color: 'var(--warning-color)', marginBottom: '10px' }}>Walk-ins ({reportData.walkins.length})</h3>
                {reportData.walkins.length > 0 ? (
                  <table>
                    <thead><tr><th>Name</th><th>Service</th><th>Amount</th><th>Time</th></tr></thead>
                    <tbody>
                      {reportData.walkins.map((w, i) => (
                        <tr key={i}><td>{w.member_name}</td><td style={{ textTransform: 'capitalize' }}>{w.service}</td><td>{w.amount} RWF</td><td>{w.timestamp}</td></tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p style={{ fontSize: '14px', color: '#64748b' }}>No walk-ins on this date.</p>}
              </div>

              <div>
                <h3 style={{ color: 'var(--primary-color)', marginBottom: '10px' }}>Subscribers ({reportData.subscribers.length})</h3>
                {reportData.subscribers.length > 0 ? (
                  <table>
                    <thead><tr><th>Name</th><th>Service</th><th>Time</th></tr></thead>
                    <tbody>
                      {reportData.subscribers.map((s, i) => (
                        <tr key={i}><td>{s.member_name}</td><td style={{ textTransform: 'capitalize' }}>{s.service}</td><td>{s.timestamp}</td></tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p style={{ fontSize: '14px', color: '#64748b' }}>No subscribers on this date.</p>}
              </div>

              <div>
                <h3 style={{ color: 'var(--success-color)', marginBottom: '10px' }}>Partners ({reportData.partners.length})</h3>
                {reportData.partners.length > 0 ? (
                  <table>
                    <thead><tr><th>Name</th><th>Service</th><th>Time</th></tr></thead>
                    <tbody>
                      {reportData.partners.map((p, i) => (
                        <tr key={i}><td>{p.member_name}</td><td style={{ textTransform: 'capitalize' }}>{p.service}</td><td>{p.timestamp}</td></tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p style={{ fontSize: '14px', color: '#64748b' }}>No partner check-ins on this date.</p>}
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>Select a date to view report.</p>
          )}
        </div>
      </div>
    </div>
  );
}
