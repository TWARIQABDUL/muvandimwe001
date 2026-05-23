import React from 'react';

export default function PendingRenewals({ dashboardData, handleRenewal, loading }) {
  return (
    <div className="renewals-tab">
      <div className="card">
        <h2 className="card-title">Pending Renewals</h2>
        {dashboardData?.pending_renewals?.length ? (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Plan</th>
                <th>Due Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {dashboardData.pending_renewals.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.name}</strong></td>
                  <td>{item.subscription}</td>
                  <td style={{ color: 'var(--danger-color)', fontWeight: '600' }}>{item.next_renewal_date}</td>
                  <td>
                    <button
                      className="btn-primary btn-small"
                      onClick={() => handleRenewal(item.id)}
                      disabled={loading}
                    >
                      Renew Subscription
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center" style={{ padding: '40px', color: 'var(--text-secondary)' }}>
            No renewals pending for today. Everyone is up to date!
          </div>
        )}
      </div>
    </div>
  );
}
