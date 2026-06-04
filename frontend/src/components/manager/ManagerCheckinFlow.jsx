import React, { useState } from 'react';
import { Camera } from 'lucide-react';
import { Table } from 'antd';
import FullScreenScanner from '../FullScreenScanner.jsx';

export default function ManagerCheckinFlow({
  services,
  dashboardData,
  handleCheckinWalkIn,
  handleLookupQr,
  handleSearchName,
  handleSelectSearchResult,
  handleCheckinMember,
  handleRenewal,
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
  paymentMethod,
  setPaymentMethod,
  loading
}) {
  const [checkinType, setCheckinType] = useState('subscriber');
  const [isScanning, setIsScanning] = useState(false);

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

  const onCameraScan = (scannedId) => {
    setQrCode(scannedId);
    setIsScanning(false);
    handleLookupQr(null, scannedId);
  };

  return (
    <div className="checkin-flow-tab">
      {isScanning && (
        <FullScreenScanner 
          title="Scan Member Card"
          description="Scan a member's card to look up their profile."
          onScan={onCameraScan}
          onClose={() => setIsScanning(false)}
        />
      )}
      
      {/* Overview Cards */}
      <div className="grid grid-2" style={{ marginBottom: '30px', gap: '20px' }}>
        <div className="card" style={{ background: 'var(--primary-color)', color: 'white' }}>
          <div style={{ opacity: 0.9, marginBottom: '5px' }}>Daily Passes</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '15px' }}>{dashboardData?.summary?.checkins_today ?? 0}</div>
          <div style={{ fontSize: '14px', borderTop: '1px solid rgba(255,255,255,0.3)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '5px' }}>
            <span>Per day: {dashboardData?.summary?.walkin_checkins ?? 0}</span>
            <span>Abonment: {dashboardData?.summary?.subscriber_checkins ?? 0}</span>
            <span>VIP: {dashboardData?.summary?.partner_checkins ?? 0}</span>
            <span style={{ fontWeight: 'bold' }}>New Abonment: {dashboardData?.summary?.new_subscriptions ?? 0}</span>
          </div>
        </div>
        
        <div className="card" style={{ background: 'var(--success-color)', color: 'white' }}>
          <div style={{ opacity: 0.9, marginBottom: '5px' }}>Total Cash</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '15px' }}>{(dashboardData?.summary?.revenue_today ?? 0).toLocaleString()} RWF</div>
          <div style={{ fontSize: '14px', borderTop: '1px solid rgba(255,255,255,0.3)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Cash: {(dashboardData?.summary?.cash_revenue_today ?? 0).toLocaleString()} RWF</span>
            <span>MOMO: {(dashboardData?.summary?.momo_revenue_today ?? 0).toLocaleString()} RWF</span>
          </div>
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
              
              {!memberLookup && (
                <div style={{ marginBottom: '30px', textAlign: 'center', padding: '30px 20px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#f0fdf4', color: '#16a34a', marginBottom: '20px'
                  }}>
                    <Camera size={32} />
                  </div>
                  <h3 style={{ marginBottom: '15px', color: '#0f172a', fontSize: '20px' }}>Quick Scan Check-in</h3>
                  <p style={{ marginBottom: '25px', color: '#64748b', fontSize: '15px' }}>
                    Instantly pull up a member's profile by scanning their physical gym card.
                  </p>
                  
                  <button 
                    type="button"
                    className="btn-primary" 
                    onClick={() => setIsScanning(true)}
                    style={{ padding: '16px 32px', fontSize: '18px', display: 'inline-flex', alignItems: 'center', gap: '10px' }}
                  >
                    <Camera size={24} /> Open Scanner
                  </button>
                  
                  {/* <div style={{ textAlign: 'center', marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: '13px', color: '#94a3b8' }}>Or enter ID manually if camera is unavailable:</p>
                    <form onSubmit={(e) => handleLookupQr(e)} style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '10px' }}>
                      <input
                        type="text"
                        placeholder="Manual QR UUID..."
                        value={qrCode}
                        onChange={(e) => setQrCode(e.target.value)}
                        style={{ padding: '10px', fontSize: '14px', maxWidth: '250px' }}
                      />
                      <button className="btn-secondary" type="submit" disabled={loading} style={{ padding: '10px 15px' }}>
                        Lookup
                      </button>
                    </form>
                  </div> */}
                </div>
              )}

              <h3 style={{ marginBottom: '15px', color: 'var(--text-primary)', marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>Or Search by Name</h3>
              <form onSubmit={handleSearchName} style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Enter full name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ flex: '3 1 200px', padding: '12px' }}
                />
                <button className="btn-primary" type="submit" disabled={loading} style={{ flex: '1 1 120px', padding: '12px 16px', whiteSpace: 'nowrap' }}>
                  Search
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
                          {member.type === 'b2b' ? `Partner Organization: ${member.employer_name || 'Yes'}` : member.is_card === 1 ? `Session Card (${member.remaining_taps} taps)` : 'Monthly Subscription'}
                        </span>
                      </div>
                      <span className={`badge ${member.type === 'b2b' ? 'badge-success' : member.subscription_status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                        {member.type === 'b2b' ? 'PARTNER' : member.subscription_status}
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
                      <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
                        {memberLookup.type === 'b2b' ? `Partner: ${memberLookup.employer_name || 'B2B'}` : `Allowed: ${memberLookup.allowed_services?.join(', ') || 'gym'}`}
                      </p>
                    </div>
                    <span className={`badge ${memberLookup.type === 'b2b' ? 'badge-success' : memberLookup.subscription_status === 'active' ? 'badge-success' : 'badge-danger'}`} style={{ padding: '6px 12px', fontSize: '14px' }}>
                      {memberLookup.type === 'b2b' ? 'PARTNER MEMBER' : memberLookup.subscription_status.toUpperCase()}
                    </span>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    {(() => {
                      let remainingDays = null;
                      if (memberLookup.next_renewal_date) {
                        const today = new Date();
                        today.setHours(0,0,0,0);
                        const renewal = new Date(memberLookup.next_renewal_date);
                        remainingDays = Math.ceil((renewal - today) / (1000 * 60 * 60 * 24));
                      }
                      
                      if (memberLookup.type === 'b2b') {
                        return (
                          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px', borderRadius: '6px', color: '#166534', fontWeight: '500' }}>
                            Organization Billing: Select any service below
                          </div>
                        );
                      }
                      
                      return memberLookup.is_card === 1 ? (
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '12px', borderRadius: '6px', color: '#991b1b', fontWeight: '600' }}>
                          Session Card: {memberLookup.remaining_taps} Taps Remaining
                        </div>
                      ) : (
                        <div style={{ 
                          background: remainingDays !== null && remainingDays <= 3 ? '#fffbeb' : '#f0fdf4', 
                          border: remainingDays !== null && remainingDays <= 3 ? '1px solid #fde68a' : '1px solid #bbf7d0', 
                          padding: '12px', borderRadius: '6px', 
                          color: remainingDays !== null && remainingDays <= 3 ? '#b45309' : '#166534', 
                          fontWeight: '500' 
                        }}>
                          Standard Monthly Subscription
                          {remainingDays !== null && (
                            <div style={{ fontSize: '13px', marginTop: '4px', fontWeight: '600' }}>
                              Expires on: {memberLookup.next_renewal_date} 
                              {' '}
                              ({remainingDays < 0 
                                ? `Expired ${Math.abs(remainingDays)} ${Math.abs(remainingDays) === 1 ? 'day' : 'days'} ago` 
                                : remainingDays === 0 
                                  ? 'Expires today' 
                                  : `${remainingDays} ${remainingDays === 1 ? 'day' : 'days'} remaining`})
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="form-group">
                    <label>Select Service for Check-in</label>
                    <select
                      value={memberService}
                      onChange={(e) => setMemberService(e.target.value)}
                      style={{ padding: '12px', fontSize: '15px' }}
                    >
                      {services.map((s) => {
                        const isIncluded = memberLookup.type === 'b2b' ? true : (memberLookup.allowed_services?.length ? memberLookup.allowed_services.includes(s.name) : false);
                        const labelSuffix = memberLookup.type === 'b2b' ? '(Partner Billing)' : isIncluded ? '(Included)' : `(Extra: ${Number(s.price_daily).toLocaleString()} RWF)`;
                        return (
                          <option key={s.id} value={s.name}>
                            {s.name.charAt(0).toUpperCase() + s.name.slice(1)} {labelSuffix}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {memberLookup.type !== 'b2b' && (memberLookup.subscription_status !== 'active' || !memberLookup.allowed_services?.length || !memberLookup.allowed_services.includes(memberService)) && (
                    <div className="form-group" style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600' }}>Payment Method {memberLookup.subscription_status !== 'active' ? '(Renewal)' : '(Extra Service)'}</label>
                      <div style={{ display: 'flex', gap: '20px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input 
                            type="radio" 
                            name="memberPaymentMethod" 
                            value="Cash" 
                            checked={paymentMethod === 'Cash'} 
                            onChange={(e) => setPaymentMethod(e.target.value)} 
                          />
                          Cash
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input 
                            type="radio" 
                            name="memberPaymentMethod" 
                            value="MOMO" 
                            checked={paymentMethod === 'MOMO'} 
                            onChange={(e) => setPaymentMethod(e.target.value)} 
                          />
                          MOMO
                        </label>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                    <button
                      className="btn-primary"
                      onClick={handleCheckinMember}
                      disabled={loading || (memberLookup.type !== 'b2b' && ((memberLookup.is_card === 1 && memberLookup.remaining_taps <= 0) || memberLookup.subscription_status !== 'active'))}
                      style={{ flex: '1 1 200px', padding: '15px', fontSize: '16px' }}
                    >
                      Confirm Check-in
                    </button>
                    
                    {memberLookup.type !== 'b2b' && (
                      <button
                        className="btn-secondary"
                        onClick={(e) => {
                          e.preventDefault();
                          handleRenewal(memberLookup.id);
                        }}
                        disabled={loading}
                        style={{ flex: '1 1 200px', padding: '15px', fontSize: '16px', background: '#e2e8f0', color: '#0f172a', border: '1px solid #cbd5e1' }}
                      >
                        Renew Subscription
                      </button>
                    )}
                  </div>
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

              <div className="form-group" style={{ marginTop: '20px', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600' }}>Payment Method</label>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="walkInPaymentMethod" 
                      value="Cash" 
                      checked={paymentMethod === 'Cash'} 
                      onChange={(e) => setPaymentMethod(e.target.value)} 
                    />
                    Cash
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="walkInPaymentMethod" 
                      value="MOMO" 
                      checked={paymentMethod === 'MOMO'} 
                      onChange={(e) => setPaymentMethod(e.target.value)} 
                    />
                    MOMO
                  </label>
                </div>
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
          <Table 
            columns={[
              { title: 'Member', key: 'member_name', fixed: 'left', width: 150, render: (_, item) => <strong>{item.member_name || 'Walk-in'}</strong> },
              { title: 'Service', dataIndex: 'service', key: 'service', width: 150, render: text => <span style={{ textTransform: 'capitalize' }}>{text}</span> },
              { title: 'Type', key: 'type', width: 150, render: (_, item) => (
                <span className={`badge ${item.type === 'walk_in' ? 'badge-warning' : item.type === 'b2b' ? 'badge-success' : 'badge-primary'}`}>
                  {item.type === 'b2b' ? 'Partner' : item.type === 'subscription' ? 'Subscriber' : item.type}
                </span>
              ) },
              { title: 'Time', dataIndex: 'timestamp', key: 'timestamp', width: 150 }
            ]}
            dataSource={dashboardData.recent_checkins.slice(0, 20).map((item, index) => ({ ...item, key: `${item.member_name}-${index}` }))}
            pagination={{ pageSize: 5 }}
            scroll={{ x: 'max-content' }}
            size="small"
          />
        ) : (
          <p style={{ color: 'var(--text-secondary)' }}>No check-ins today yet.</p>
        )}
      </div>
    </div>
  );
}
