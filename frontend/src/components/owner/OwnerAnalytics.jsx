import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function OwnerAnalytics({ data, timeframe, setTimeframe, trendData }) {
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

      <div className="grid grid-3" style={{ marginBottom: '20px' }}>
        <div className="card">
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{dashboardData.snapshot.total_checkins}</div>
          <div style={{ color: 'var(--text-secondary)' }}>Total Check-ins</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{dashboardData.snapshot.walk_in_checkins}</div>
          <div style={{ color: 'var(--text-secondary)' }}>Walk-ins</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{dashboardData.snapshot.subscriber_checkins}</div>
          <div style={{ color: 'var(--text-secondary)' }}>Subscribers Checked-in</div>
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
          <div style={{ color: 'var(--text-secondary)' }}>Subscription Signup & Renewal Cash</div>
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
                        <span className={`badge badge-${c.type === 'walk_in' ? 'warning' : 'primary'}`}>
                          {c.type === 'walk_in' ? 'Walk-in' : 'Subscriber'}
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
          <h2 className="card-title">7-Day Revenue Trend</h2>
          {trendData && trendData.length ? (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Total Daily Revenue</th>
                </tr>
              </thead>
              <tbody>
                {trendData.map((entry) => (
                  <tr key={entry.date}>
                    <td>{entry.date}</td>
                    <td style={{ fontWeight: '600', color: 'var(--success-color)' }}>
                      {entry.revenue.toLocaleString()} RWF
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>No trend data available yet for the last 7 days.</p>
          )}
        </div>
      </div>
    </div>
  );
}
