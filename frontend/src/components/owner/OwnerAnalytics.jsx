import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Table } from 'antd';
import { api } from '../../store/authStore.js';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function OwnerAnalytics({ data, timeframe, setTimeframe, trendData }) {
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportTypeFilter, setReportTypeFilter] = useState('all');
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const handleDateChange = (days) => {
    const current = new Date(reportDate);
    current.setDate(current.getDate() + days);
    const newDateStr = current.toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];
    if (newDateStr <= todayStr) {
      setReportDate(newDateStr);
    }
  };

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

  let filteredReportCheckins = [];
  if (reportData) {
    let combined = [];
    if (reportTypeFilter === 'all' || reportTypeFilter === 'walkins') {
      combined = combined.concat(reportData.walkins.map(w => ({ ...w, displayType: 'Walk-in', badgeClass: 'warning' })));
    }
    if (reportTypeFilter === 'all' || reportTypeFilter === 'subscribers') {
      combined = combined.concat(reportData.subscribers.map(s => ({ ...s, displayType: 'Subscriber', badgeClass: 'primary' })));
    }
    if (reportTypeFilter === 'all' || reportTypeFilter === 'partners') {
      combined = combined.concat(reportData.partners.map(p => ({ ...p, displayType: 'Partner', badgeClass: 'success' })));
    }
    filteredReportCheckins = combined;
  }

  // Ant Design Table Columns Configuration
  const revenueColumns = [
    {
      title: 'Service',
      dataIndex: 'service',
      key: 'service',
      fixed: 'left',
      width: 150,
      render: (text) => <span style={{ textTransform: 'capitalize', fontWeight: '600' }}>{text}</span>,
    },
    {
      title: 'Daily Users',
      key: 'walk_in',
      width: 120,
      render: (_, record) => (
        <div>
          <div>{(record.walk_in || 0).toLocaleString()}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{record.walk_in_count || 0} visits</div>
        </div>
      ),
    },
    {
      title: 'Daily',
      key: 'daily',
      width: 120,
      render: (_, record) => (
        <div>
          <div>{(record.daily || 0).toLocaleString()}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{record.daily_count || 0} visits</div>
        </div>
      ),
    },
    {
      title: 'Subscription',
      key: 'subscription',
      width: 150,
      render: (_, record) => (
        <div>
          <div>{(record.subscription || 0).toLocaleString()}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{record.subscription_count || 0} paid</div>
        </div>
      ),
    },
    {
      title: 'Total',
      key: 'total',
      width: 150,
      render: (_, record) => (
        <div style={{ fontWeight: '700', color: 'var(--primary-color)' }}>
          <div>{(record.total || 0).toLocaleString()} RWF</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>{record.total_count || 0} total</div>
        </div>
      ),
    },
  ];

  const revenueData = Object.entries(dashboardData.revenue_breakdown || {}).map(([service, breakdown]) => ({
    key: service,
    service,
    ...breakdown,
  }));

  const recentCheckinColumns = [
    {
      title: 'Name',
      dataIndex: 'member_name',
      key: 'member_name',
      fixed: 'left',
      width: 150,
    },
    {
      title: 'Service',
      dataIndex: 'service',
      key: 'service',
      width: 120,
      render: (text) => <span style={{ textTransform: 'capitalize' }}>{text}</span>,
    },
    {
      title: 'Type',
      key: 'type',
      width: 120,
      render: (_, record) => {
        const badgeClass = record.type === 'walk_in' ? 'warning' : record.type === 'b2b' ? 'success' : 'primary';
        const displayText = record.type === 'walk_in' ? 'Walk-in' : record.type === 'b2b' ? 'Partner' : 'Subscriber';
        return <span className={`badge badge-${badgeClass}`}>{displayText}</span>;
      },
    },
    {
      title: 'Time',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 120,
      render: (text) => <span style={{ color: 'var(--text-secondary)' }}>{text}</span>,
    },
  ];

  const recentCheckinsData = (dashboardData.recent_checkins || []).map((c, i) => ({ ...c, key: i }));

  const dailyCheckinColumns = [
    {
      title: 'Name',
      dataIndex: 'member_name',
      key: 'member_name',
      fixed: 'left',
      width: 150,
    },
    {
      title: 'Service',
      dataIndex: 'service',
      key: 'service',
      width: 120,
      render: (text) => <span style={{ textTransform: 'capitalize' }}>{text}</span>,
    },
    {
      title: 'Type',
      key: 'type',
      width: 120,
      render: (_, record) => (
        <span className={`badge badge-${record.badgeClass}`}>
          {record.displayType}
        </span>
      ),
    },
    {
      title: 'Amount',
      key: 'amount',
      width: 120,
      render: (_, record) => record.amount ? `${record.amount} RWF` : '-',
    },
    {
      title: 'Time',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 120,
      render: (text) => <span style={{ color: 'var(--text-secondary)' }}>{text}</span>,
    },
  ];

  const dailyCheckinsData = filteredReportCheckins.map((c, i) => ({ ...c, key: i }));

  return (
    <div className="analytics-tab">
      <div className="card">
        <div className="flex-between">
          <h2 className="card-title" style={{ margin: 0 }}>Snapshot Period</h2>
          <div className="timeframe-buttons">
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '20px', marginBottom: '20px' }}>
        <div className="card">
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{dashboardData.snapshot.total_checkins}</div>
          <div style={{ color: 'var(--text-secondary)' }}>Total People Entered</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{dashboardData.snapshot.walk_in_checkins}</div>
          <div style={{ color: 'var(--text-secondary)' }}>Total Daily</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {dashboardData.snapshot.partner_checkins !== undefined 
              ? dashboardData.snapshot.subscriber_checkins
              : Math.max(0, dashboardData.snapshot.subscriber_checkins - (dashboardData.recent_checkins || []).filter(c => c.type === 'b2b').length)}
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>Abonment Monthly</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {dashboardData.snapshot.partner_checkins !== undefined 
              ? dashboardData.snapshot.partner_checkins 
              : (dashboardData.recent_checkins || []).filter(c => c.type === 'b2b').length}
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>Partners Subscribers (VIP)</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {Object.values(dashboardData.revenue_breakdown || {}).reduce((sum, breakdown) => sum + (breakdown.subscription_count || 0), 0)}
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>New Abonnements</div>
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
          <div style={{ color: 'var(--text-secondary)' }}>Daily Cash (At Door)</div>
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
            <Table 
              columns={revenueColumns} 
              dataSource={revenueData} 
              pagination={false}
              scroll={{ x: 700 }}
              size="middle"
            />
          </div>
        </div>
      </div>
        
      <div className="grid grid-1">
        <div className="card">
          <h2 className="card-title">Recent Check-ins</h2>
          {recentCheckinsData.length ? (
            <Table 
              columns={recentCheckinColumns} 
              dataSource={recentCheckinsData} 
              pagination={{ pageSize: 5 }}
              scroll={{ x: 600 }}
              size="small"
            />
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>No check-ins for this period yet.</p>
          )}
        </div>
        
        <div className="card">
          <div className="flex-between" style={{ marginBottom: '15px' }}>
            <h2 className="card-title" style={{ margin: 0 }}>Daily Check-ins Report</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <select 
                value={reportTypeFilter} 
                onChange={e => setReportTypeFilter(e.target.value)}
                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
              >
                <option value="all">All Types</option>
                <option value="walkins">Daily Users</option>
                <option value="subscribers">Monthly User</option>
                <option value="partners">Partners (VIP)</option>
              </select>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <button 
                  onClick={() => handleDateChange(-1)}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}
                >
                  &lt;
                </button>
                <input 
                  type="date" 
                  value={reportDate} 
                  max={new Date().toISOString().split('T')[0]}
                  onChange={e => setReportDate(e.target.value)} 
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                />
                <button 
                  onClick={() => handleDateChange(1)}
                  disabled={reportDate >= new Date().toISOString().split('T')[0]}
                  style={{ 
                    padding: '8px 12px', 
                    borderRadius: '6px', 
                    border: '1px solid #e2e8f0', 
                    background: reportDate >= new Date().toISOString().split('T')[0] ? '#f1f5f9' : 'white', 
                    cursor: reportDate >= new Date().toISOString().split('T')[0] ? 'not-allowed' : 'pointer' 
                  }}
                >
                  &gt;
                </button>
              </div>
            </div>
          </div>
          
          {reportLoading ? (
            <p>Loading report data...</p>
          ) : reportData ? (
            <div>
              {dailyCheckinsData.length > 0 ? (
                <Table 
                  columns={dailyCheckinColumns} 
                  dataSource={dailyCheckinsData} 
                  pagination={{ pageSize: 10 }}
                  scroll={{ x: 700 }}
                  size="small"
                />
              ) : (
                <p style={{ color: 'var(--text-secondary)' }}>No check-ins found for the selected filter.</p>
              )}
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>Select a date to view report.</p>
          )}
        </div>
      </div>
    </div>
  );
}
