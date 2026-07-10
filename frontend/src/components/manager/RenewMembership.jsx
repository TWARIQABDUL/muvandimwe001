import React, { useState } from 'react';
import { Camera } from 'lucide-react';
import { Table } from 'antd';
import FullScreenScanner from '../FullScreenScanner.jsx';

export default function RenewMembership({
  dashboardData,
  handleRenewal,
  handleSearchName,
  handleLookupQr,
  handleSelectSearchResult,
  searchQuery,
  setSearchQuery,
  searchResults,
  memberLookup,
  paymentMethod,
  setPaymentMethod,
  loading,
  renewalMonths,
  setRenewalMonths,
  couponCode,
  setCouponCode,
  handleValidateCoupon,
  couponMessage,
  appliedCoupon
}) {
  const [isScanning, setIsScanning] = useState(false);

  const onCameraScan = (data) => {
    setIsScanning(false);
    if (data) handleLookupQr(data);
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', fixed: 'left', width: 150, render: text => <strong>{text}</strong> },
    { title: 'Plan', dataIndex: 'subscription', key: 'subscription', width: 150 },
    { title: 'Due Date', dataIndex: 'next_renewal_date', key: 'next_renewal_date', width: 120, render: text => <span style={{ color: 'var(--danger-color)', fontWeight: '600' }}>{text}</span> },
    { title: 'Action', key: 'action', width: 150, render: (_, item) => (
        <button
          className="btn-primary btn-small"
          onClick={() => {
            const formattedMember = {
              ...item,
              allowed_services: item.included_services ? item.included_services.split(',') : []
            };
            handleSelectSearchResult(formattedMember);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          disabled={loading}
        >
          Select for Renewal
        </button>
      )
    }
  ];

  return (
    <div className="renewals-tab" style={{ animation: 'fadeIn 0.3s' }}>
      {isScanning && (
        <FullScreenScanner
          title="Scan Member Card"
          description="Scan a member's card to renew subscription."
          onScan={onCameraScan}
          onClose={() => setIsScanning(false)}
        />
      )}

      {/* Manual Renew Section */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h2 className="card-title">Search Member to Renew</h2>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <button 
            className="btn-secondary" 
            onClick={() => setIsScanning(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 200px', justifyContent: 'center', padding: '15px' }}
          >
            <Camera size={20} />
            Scan QR Card
          </button>
          
          <div style={{ flex: '2 1 300px' }}>
            <form onSubmit={handleSearchName} style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '10px' }}>
              <input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: '3 1 200px', padding: '12px' }}
              />
              <button className="btn-primary" type="submit" disabled={loading} style={{ flex: '1 1 120px', padding: '12px 16px', whiteSpace: 'nowrap' }}>
                Search Name
              </button>
            </form>
          </div>
        </div>

        {/* Search Results */}
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

        {/* Member Lookup Result */}
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
                      Partner members are billed directly to the organization. No manual renewal required.
                    </div>
                  );
                }
                
                return memberLookup.is_card === 1 ? (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '6px', color: '#334155', fontWeight: '500' }}>
                    Session Cards currently require a new registration to top up.
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

            {memberLookup.type !== 'b2b' && memberLookup.is_card !== 1 && (
              <>
                <div className="form-group" style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600' }}>Duration (Months)</label>
                  <input
                    type="number"
                    className="form-control" 
                    value={renewalMonths} 
                    onChange={(e) => setRenewalMonths(Math.max(1, Number(e.target.value)))}
                    min="1"
                    style={{ marginBottom: '15px', padding: '10px', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />

                  <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600' }}>Payment Method</label>
                  <div style={{ display: 'flex', gap: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name="renewPaymentMethod" 
                        value="Cash" 
                        checked={paymentMethod === 'Cash'} 
                        onChange={(e) => setPaymentMethod(e.target.value)} 
                      />
                      Cash
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name="renewPaymentMethod" 
                        value="MOMO" 
                        checked={paymentMethod === 'MOMO'} 
                        onChange={(e) => setPaymentMethod(e.target.value)} 
                      />
                      MOMO
                    </label>
                  </div>
                </div>

                <div className="form-group" style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600' }}>Apply Coupon</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      placeholder="Enter coupon code..."
                      value={couponCode || ''}
                      onChange={(e) => setCouponCode(e.target.value)}
                      onBlur={handleValidateCoupon}
                      style={{ textTransform: 'uppercase', flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      onClick={handleValidateCoupon} 
                      style={{ padding: '0 20px', whiteSpace: 'nowrap' }}
                    >
                      Apply
                    </button>
                  </div>
                  {couponMessage && (
                    <div style={{ marginTop: '8px', fontSize: '13px', color: couponMessage.type === 'success' ? '#059669' : '#dc2626', fontWeight: '500' }}>
                      {couponMessage.text}
                    </div>
                  )}
                </div>

                <button
                  className="btn-primary"
                  onClick={(e) => {
                    e.preventDefault();
                    handleRenewal(memberLookup.id);
                  }}
                  disabled={loading}
                  style={{ width: '100%', padding: '15px', fontSize: '16px', marginTop: '10px', display: 'flex', justifyContent: 'space-between' }}
                >
                  <span>Renew Subscription</span>
                  {memberLookup.monthly_fee ? (
                    <span style={{ fontWeight: 'bold' }}>
                      {(() => {
                        const baseAmt = memberLookup.monthly_fee * renewalMonths;
                        const discountPct = appliedCoupon ? appliedCoupon.discount_percent : 0;
                        const discountAmt = Math.round(baseAmt * (discountPct / 100));
                        return (baseAmt - discountAmt).toLocaleString();
                      })()} RWF
                    </span>
                  ) : null}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Pending Renewals List */}
      <div className="card">
        <div className="flex-between" style={{ marginBottom: '20px' }}>
          <h2 className="card-title" style={{ margin: 0 }}>Pending Renewals ({dashboardData?.pending_renewals?.length || 0})</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: '#f8fafc', padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontWeight: '600' }}>Payment Method:</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input 
                type="radio" 
                name="listPaymentMethod" 
                value="Cash" 
                checked={paymentMethod === 'Cash'} 
                onChange={(e) => setPaymentMethod(e.target.value)} 
              />
              Cash
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input 
                type="radio" 
                name="listPaymentMethod" 
                value="MOMO" 
                checked={paymentMethod === 'MOMO'} 
                onChange={(e) => setPaymentMethod(e.target.value)} 
              />
              MOMO
            </label>
          </div>
        </div>
        {dashboardData?.pending_renewals?.length ? (
          <Table 
            columns={columns}
            dataSource={dashboardData.pending_renewals.map(item => ({ ...item, key: item.id }))}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 'max-content' }}
            size="middle"
          />
        ) : (
          <div className="text-center" style={{ padding: '40px', color: 'var(--text-secondary)' }}>
            No renewals pending for today. Everyone is up to date!
          </div>
        )}
      </div>
    </div>
  );
}
