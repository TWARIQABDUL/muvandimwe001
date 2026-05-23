import React from 'react';

export default function OwnerCheckins({ data }) {
  const reports = data?.dashboard?.reports;

  return (
    <div className="checkins-tab">
      <div className="card">
        <h2 className="card-title">Recent Check-in Activity</h2>
        <div className="grid grid-2">
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '10px' }}>New Subscriber Sign-ups</h3>
            {reports?.new_subscribers?.length ? (
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Dynamic Package</th>
                    <th>Monthly Fee</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.new_subscribers.map((sub, idx) => (
                    <tr key={idx}>
                      <td><strong>{sub.name}</strong></td>
                      <td>{sub.plan}</td>
                      <td>{Number(sub.monthly_fee).toLocaleString()} RWF</td>
                      <td>{sub.start_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No new subscribers signed up in this timeframe.</p>
            )}
          </div>

          <div>
            <h3 style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '10px' }}>Existing Subscriber Check-ins</h3>
            {reports?.old_checked_in?.length ? (
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Service</th>
                    <th>Dynamic Package</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.old_checked_in.map((sub, idx) => (
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
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No existing subscribers checked in in this timeframe.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
