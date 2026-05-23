import React from 'react';

export default function OwnerMembers({ activeMembers }) {
  return (
    <div className="members-tab">
      <div className="card">
        <h2 className="card-title">Detailed Members List</h2>
        {activeMembers?.members_list?.length ? (
          <>
            <div className="flex-between" style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
              <span><strong>Total Active:</strong> {activeMembers.total_active} members</span>
              <span><strong>Est. MRR:</strong> {activeMembers.estimated_mrr.toLocaleString()} RWF</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Member Name</th>
                  <th>Contact Details</th>
                  <th>Dynamic Package Plan</th>
                  <th>Subscription Status</th>
                </tr>
              </thead>
              <tbody>
                {activeMembers.members_list.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <strong>{member.name}</strong>
                    </td>
                    <td style={{ fontSize: '13px' }}>
                      <div>{member.email || 'No Email'}</div>
                      <div style={{ color: 'var(--text-secondary)' }}>{member.phone || 'No Phone'}</div>
                    </td>
                    <td>{member.subscription_name}</td>
                    <td>
                      {member.is_card === 1 ? (
                        <span className="badge badge-success" style={{ backgroundColor: '#e0f2fe', color: '#0369a1' }}>
                          🎫 Session Card: {member.remaining_taps} Taps Left (Exp: {member.next_renewal_date})
                        </span>
                      ) : (
                        <span className="badge badge-success">
                          📅 Monthly (Renewal: {member.next_renewal_date})
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p style={{ color: 'var(--text-secondary)' }}>Active membership details are not available yet.</p>
        )}
      </div>
    </div>
  );
}
