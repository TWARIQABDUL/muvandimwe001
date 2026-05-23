import React, { useState } from 'react';

export default function ManagerCheckinFlow({
  services,
  dashboardData,
  handleCheckinWalkIn,
  handleLookupQr,
  handleSearchName,
  handleSelectSearchResult,
  handleCheckinMember,
  qrCode,
  setQrCode,
  searchQuery,
  setSearchQuery,
  searchResults,
  memberLookup,
  memberService,
  setMemberService,
  walkInName,
  setWalkInName,
  walkInServices,
  setWalkInServices,
  walkInAmount,
  setWalkInAmount,
  loading
}) {
  const [checkinType, setCheckinType] = useState('subscriber');

  const handleToggleWalkInService = (serviceName) => {
    let newSelected;
    if (walkInServices.includes(serviceName)) {
      newSelected = walkInServices.filter(s => s !== serviceName);
    } else {
      newSelected = [...walkInServices, serviceName];
    }
    setWalkInServices(newSelected);
    
    // Recalculate amount
    let sum = 0;
    newSelected.forEach(sName => {
      const s = services.find(serv => serv.name === sName);
      if (s) sum += Number(s.price_daily) || 0;
    });
    setWalkInAmount(sum.toString());
  };

  return (
    <div className="checkin-flow-tab">
      
      {/* Overview Cards */}
      <div className="grid grid-3" style={{ marginBottom: '30px' }}>
        <div className="card" style={{ background: 'var(--primary-color)', color: 'white' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{dashboardData?.summary?.checkins_today ?? 0}</div>
          <div style={{ opacity: 0.9 }}>Total Check-ins Today</div>
        </div>
        <div className="card" style={{ background: 'var(--success-color)', color: 'white' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{(dashboardData?.summary?.revenue_today ?? 0).toLocaleString()} RWF</div>
          <div style={{ opacity: 0.9 }}>Revenue Today</div>
        </div>
        <div className="card" style={{ background: '#f59e0b', color: 'white' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{dashboardData?.summary?.renewals_pending ?? 0}</div>
          <div style={{ opacity: 0.9 }}>Pending Renewals</div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 className="card-title text-center" style={{ fontSize: '24px', marginBottom: '30px' }}>Check-in Portal</h2>
        
        <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
          <button 
            className={`btn-primary ${checkinType === 'subscriber' ? '' : 'btn-secondary'}`} 
            style={{ flex: 1, padding: '15px', fontSize: '16px' }}
            onClick={() => setCheckinType('subscriber')}
          >
            Subscriber Check-in
          </button>
          <button 
            className={`btn-primary ${checkinType === 'walkin' ? '' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '15px', fontSize: '16px' }}
            onClick={() => setCheckinType('walkin')}
          >
            Daily Walk-In Payer
          </button>
        </div>

        {checkinType === 'subscriber' ? (
          <div className="subscriber-flow" style={{ animation: 'fadeIn 0.3s' }}>
            <div style={{ background: 'var(--bg-light)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h3 style={{ marginBottom: '15px', color: 'var(--text-primary)' }}>Scan Member QR or Search UUID</h3>
              <form onSubmit={handleLookupQr} className="flex gap-10" style={{ marginBottom: '20px' }}>
                <input
                  type="text"
                  placeholder="Paste member QR UUID"
                  value={qrCode}
                  onChange={(e) => setQrCode(e.target.value)}
                  style={{ flex: 1, padding: '12px' }}
                />
                <button className="btn-primary" type="submit" disabled={loading} style={{ padding: '12px 24px' }}>
                  Lookup by QR
                </button>
              </form>

              <h3 style={{ marginBottom: '15px', color: 'var(--text-primary)', marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>Or Search by Name</h3>
              <form onSubmit={handleSearchName} className="flex gap-10">
                <input
                  type="text"
                  placeholder="Enter full name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ flex: 1, padding: '12px' }}
                />
                <button className="btn-primary" type="submit" disabled={loading} style={{ padding: '12px 24px' }}>
                  Search Name
                </button>
              </form>

              {searchResults?.length > 0 && !memberLookup && (
                <div style={{ marginTop: '20px', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  {searchResults.map(member => (
                    <div 
                      key={member.id} 
                      style={{ padding: '15px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                      onClick={() => handleSelectSearchResult(member)}
                      className="hover-bg-light"
                    >
                      <div>
                        <strong style={{ display: 'block', color: '#0f172a' }}>{member.name}</strong>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>
                          {member.is_card === 1 ? `Session Card (${member.remaining_taps} taps)` : 'Monthly Subscription'}
                        </span>
                      </div>
                      <span className={`badge ${member.subscription_status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                        {member.subscription_status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {memberLookup && (
                <div style={{ marginTop: '20px', background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div className="flex-between" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '15px', marginBottom: '15px' }}>
                    <div>
                      <h4 style={{ fontSize: '18px', color: '#0f172a', margin: '0 0 5px 0' }}>{memberLookup.name}</h4>
                      <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>Allowed: {memberLookup.allowed_services?.join(', ') || 'gym'}</p>
                    </div>
                    <span className={`badge ${memberLookup.subscription_status === 'active' ? 'badge-success' : 'badge-danger'}`} style={{ padding: '6px 12px', fontSize: '14px' }}>
                      {memberLookup.subscription_status.toUpperCase()}
                    </span>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    {memberLookup.is_card === 1 ? (
                      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '12px', borderRadius: '6px', color: '#991b1b', fontWeight: '600' }}>
                        Session Card: {memberLookup.remaining_taps} Taps Remaining
                      </div>
                    ) : (
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px', borderRadius: '6px', color: '#166534', fontWeight: '500' }}>
                        Standard Monthly Subscription
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Select Service for Check-in</label>
                    <select
                      value={memberService}
                      onChange={(e) => setMemberService(e.target.value)}
                      style={{ padding: '12px', fontSize: '15px' }}
                    >
                      {services
                        .filter(s => memberLookup.allowed_services?.length ? memberLookup.allowed_services.includes(s.name) : true)
                        .map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name.charAt(0).toUpperCase() + s.name.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    className="btn-primary"
                    onClick={handleCheckinMember}
                    disabled={loading || (memberLookup.is_card === 1 && memberLookup.remaining_taps <= 0) || memberLookup.subscription_status !== 'active'}
                    style={{ width: '100%', padding: '15px', fontSize: '16px', marginTop: '10px' }}
                  >
                    Confirm Check-in
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="walkin-flow" style={{ animation: 'fadeIn 0.3s' }}>
            <form onSubmit={handleCheckinWalkIn} style={{ background: 'var(--bg-light)', padding: '30px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div className="form-group">
                <label>Payer Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Jane Doe"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  style={{ padding: '12px' }}
                />
              </div>

              <div className="form-group">
                <label style={{ marginBottom: '10px', display: 'block', fontWeight: '600' }}>Select Services</label>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '20px' }}>
                  {services.map((s) => (
                    <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'white', padding: '10px 15px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <input
                        type="checkbox"
                        checked={walkInServices.includes(s.name)}
                        onChange={() => handleToggleWalkInService(s.name)}
                      />
                      <span style={{ textTransform: 'capitalize' }}>{s.name} ({Number(s.price_daily).toLocaleString()} RWF)</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Amount Paid (RWF)</label>
                <input
                  type="number"
                  value={walkInAmount}
                  onChange={(e) => setWalkInAmount(e.target.value)}
                  style={{ padding: '12px', fontWeight: 'bold', color: 'var(--success-color)' }}
                />
              </div>

              <div style={{ marginTop: '20px', padding: '15px', background: '#eff6ff', border: '1px dashed #bfdbfe', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#1e40af', fontWeight: '500' }}>Total Due:</span>
                <span style={{ fontSize: '20px', fontWeight: '700', color: '#1d4ed8' }}>{Number(walkInAmount).toLocaleString()} RWF</span>
              </div>

              <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', padding: '15px', fontSize: '16px', marginTop: '20px' }}>
                Confirm Payment & Check-in
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Recent Activity Mini-table */}
      <div className="card" style={{ marginTop: '30px' }}>
        <h3 className="card-title">Recent Check-ins Today</h3>
        {dashboardData?.recent_checkins?.length ? (
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Service</th>
                <th>Type</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {dashboardData.recent_checkins.slice(0, 5).map((item, index) => (
                <tr key={`${item.member_name}-${index}`}>
                  <td><strong>{item.member_name || 'Walk-in'}</strong></td>
                  <td style={{ textTransform: 'capitalize' }}>{item.service}</td>
                  <td>
                    <span className={`badge ${item.type === 'walk_in' ? 'badge-warning' : 'badge-success'}`}>
                      {item.type}
                    </span>
                  </td>
                  <td>{item.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: 'var(--text-secondary)' }}>No check-ins today yet.</p>
        )}
      </div>
    </div>
  );
}
