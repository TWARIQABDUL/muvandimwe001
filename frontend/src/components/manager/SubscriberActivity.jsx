import React from 'react';

export default function SubscriberActivity({ dashboardData }) {
  return (
    <div className="activity-tab">
      <div className="card">
        <h2 className="card-title">Subscriber Activity Reports</h2>
        
        <div className="grid grid-2">
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '12px' }}>New Subscribers Registered Today</h3>
            {dashboardData?.reports?.new_subscribers?.length ? (
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Dynamic Plan</th>
                    <th>Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.reports.new_subscribers.map((sub, idx) => (
                    <tr key={idx}>
                      <td><strong>{sub.name}</strong></td>
                      <td>{sub.plan}</td>
                      <td style={{ color: 'var(--success-color)', fontWeight: '600' }}>
                        {Number(sub.monthly_fee).toLocaleString()} RWF
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center" style={{ padding: '20px', background: 'var(--bg-light)', borderRadius: '8px' }}>
                <p style={{ color: 'var(--text-secondary)' }}>No new subscribers today.</p>
              </div>
            )}
          </div>

          <div>
            <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '12px' }}>Existing Subscriber Check-Ins Today</h3>
          {dashboardData?.reports?.old_checked_in?.length ? (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Service Checked In</th>
                  <th>Dynamic Plan</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.reports.old_checked_in.map((sub, idx) => (
                  <tr key={idx}>
                    <td><strong>{sub.name}</strong></td>
                    <td style={{ textTransform: 'capitalize' }}>{sub.service}</td>
                    <td>{sub.plan}</td>
                    <td>{new Date(sub.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
