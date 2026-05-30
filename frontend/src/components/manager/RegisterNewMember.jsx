import React, { useState, useRef, useEffect } from 'react';

export default function RegisterNewMember({
  services,
  employers = [],
  newMember,
  setNewMember,
  selectedServices,
  setSelectedServices,
  isCard,
  setIsCard,
  taps,
  setTaps,
  couponCode,
  setCouponCode,
  handleValidateCoupon,
  couponMessage,
  pricing,
  handleCreateMember,
  loading,
  newMemberQr
}) {
  const [partnerSearch, setPartnerSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredEmployers = employers.filter(emp => emp.name.toLowerCase().includes(partnerSearch.toLowerCase()));

  return (
    <div className="register-tab">
      <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 className="card-title">Register New Member</h2>
        <form onSubmit={handleCreateMember} className="form-stack">
          {!newMember.qr_code_id ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '12px', border: '2px dashed #cbd5e1', marginBottom: '20px' }}>
              <h3 style={{ marginBottom: '15px', color: '#334155', fontSize: '20px' }}>Step 1: Scan Member Card</h3>
              <p style={{ marginBottom: '25px', color: '#64748b', fontSize: '15px' }}>Scan the QR code on a blank physical card to assign it to this new member.</p>
              <input
                type="text"
                placeholder="Scan Card..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (e.target.value.trim()) {
                      setNewMember({ ...newMember, qr_code_id: e.target.value.trim() });
                    }
                  }
                }}
                style={{ maxWidth: '350px', margin: '0 auto', textAlign: 'center', fontSize: '16px', padding: '12px' }}
              />
              <p style={{ marginTop: '15px', fontSize: '13px', color: '#94a3b8' }}>Press Enter after scanning</p>
            </div>
          ) : (
            <>
              <div style={{ padding: '15px 20px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: '#166534', display: 'block', fontSize: '15px', marginBottom: '4px' }}>✓ Card Assigned</strong>
                  <code style={{ color: '#15803d', fontSize: '14px', backgroundColor: '#dcfce3', padding: '2px 6px', borderRadius: '4px' }}>{newMember.qr_code_id}</code>
                </div>
                <button 
                  type="button" 
                  onClick={() => setNewMember({ ...newMember, qr_code_id: '' })}
                  style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: '500', padding: '8px' }}
                >
                  Scan Different Card
                </button>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={newMember.name}
                    onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="john@example.com"
                    value={newMember.email}
                    onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  />
                </div>
              </div>
          <div className="grid grid-2" style={{ marginTop: '15px' }}>
            <div className="form-group">
              <label>Phone (Optional)</label>
              <input
                type="text"
                placeholder="+250 788..."
                value={newMember.phone}
                onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
              />
            </div>
            <div className="form-group" ref={dropdownRef} style={{ position: 'relative' }}>
              <label>Partner Organization (B2B)</label>
              <div
                style={{
                  border: '1px solid var(--border-color)',
                  padding: '12px',
                  borderRadius: '6px',
                  background: 'var(--bg-light)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <span>
                  {newMember.employer_id 
                    ? employers.find(e => e.id === newMember.employer_id)?.name 
                    : '-- None (Standard Member) --'}
                </span>
                <span style={{ fontSize: '12px' }}>▼</span>
              </div>
              
              {showDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'white',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  marginTop: '4px',
                  maxHeight: '250px',
                  overflowY: 'auto',
                  zIndex: 50,
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}>
                  <div style={{ padding: '8px', position: 'sticky', top: 0, background: 'white', borderBottom: '1px solid var(--border-color)' }}>
                    <input
                      type="text"
                      placeholder="Search partner..."
                      value={partnerSearch}
                      onChange={(e) => setPartnerSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        outline: 'none'
                      }}
                      autoFocus
                    />
                  </div>
                  <div 
                    style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                    onClick={() => {
                      setNewMember({ ...newMember, employer_id: '' });
                      setShowDropdown(false);
                      setPartnerSearch('');
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    -- None (Standard Member) --
                  </div>
                  {filteredEmployers.map(emp => (
                    <div 
                      key={emp.id}
                      style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                      onClick={() => {
                        setNewMember({ ...newMember, employer_id: emp.id });
                        setShowDropdown(false);
                        setPartnerSearch('');
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {emp.name}
                    </div>
                  ))}
                  {filteredEmployers.length === 0 && (
                    <div style={{ padding: '10px 12px', color: '#64748b', fontSize: '14px', textAlign: 'center' }}>
                      No partners found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {!newMember.employer_id && (
            <>
              <div className="form-group" style={{ marginTop: '20px' }}>
            <label style={{ fontSize: '16px', color: 'var(--primary-color)' }}>Step 1: Select Services for Dynamic Package</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginTop: '10px' }}>
              {services.map((s) => (
                <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px', background: 'var(--bg-light)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <input
                    type="checkbox"
                    checked={selectedServices.includes(s.name)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedServices([...selectedServices, s.name]);
                      } else {
                        setSelectedServices(selectedServices.filter(n => n !== s.name));
                      }
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ textTransform: 'capitalize', fontWeight: '500' }}>{s.name}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {Number(s.price_monthly).toLocaleString()} RWF/mo
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <label style={{ fontSize: '16px', color: 'var(--primary-color)' }}>Step 2: Subscription Type</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginTop: '10px', padding: '15px', background: 'var(--bg-light)', borderRadius: '8px' }}>
              <input
                type="checkbox"
                checked={isCard}
                onChange={(e) => setIsCard(e.target.checked)}
                style={{ width: '20px', height: '20px' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <strong style={{ fontSize: '15px' }}>Session Card Option</strong>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Uses taps instead of monthly expiry (Valid for 1 year)</span>
              </div>
            </label>
          </div>

          {isCard && (
            <div className="form-group" style={{ marginLeft: '32px', marginTop: '10px' }}>
              <label>Number of Sessions (Taps)</label>
              <input
                type="number"
                value={taps}
                onChange={(e) => setTaps(e.target.value)}
                min="1"
                style={{ maxWidth: '200px' }}
              />
            </div>
          )}

          <div className="form-group" style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <label style={{ fontSize: '16px', color: 'var(--primary-color)' }}>Step 3: Discounts</label>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <input
                type="text"
                placeholder="Enter coupon code..."
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                onBlur={handleValidateCoupon}
                style={{ textTransform: 'uppercase', flex: 1 }}
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

          {selectedServices.length > 0 && (
            <div style={{ backgroundColor: '#eff6ff', borderRadius: '8px', padding: '20px', marginTop: '20px', border: '1px solid #bfdbfe' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '15px', color: '#1e40af' }}>Pricing Summary</h3>
              <div className="flex-between" style={{ marginBottom: '8px', fontSize: '14px' }}>
                <span>Subtotal (Selected Services):</span>
                <span>{pricing.sum.toLocaleString()} RWF</span>
              </div>
              {pricing.discountPct > 0 && (
                <div className="flex-between" style={{ marginBottom: '8px', color: '#059669', fontSize: '14px', fontWeight: '500' }}>
                  <span>Coupon applied ({pricing.discountPct}% off):</span>
                  <span>-{pricing.discountAmt.toLocaleString()} RWF</span>
                </div>
              )}
              <div className="flex-between" style={{ borderTop: '1px solid #bfdbfe', paddingTop: '15px', marginTop: '15px', fontWeight: '700', fontSize: '18px', color: '#1e40af' }}>
                <span>Total Package Fee:</span>
                <span>{pricing.finalAmt.toLocaleString()} RWF</span>
              </div>
            </div>
          )}
          </>
          )}

          <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: '30px', width: '100%', padding: '15px', fontSize: '16px' }}>
            {loading ? 'Processing...' : 'Register Member & Assign Card'}
          </button>
          </>
          )}
        </form>

        {newMemberQr && (
          <div className="card" style={{ marginTop: '30px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <h3 style={{ color: '#166534', marginBottom: '10px' }}>Registration Successful!</h3>
            <p style={{ marginBottom: '10px' }}>Member has been created. Here is the QR Code UUID (Simulation):</p>
            <pre style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', color: '#166534', border: '1px solid #dcfce3', overflowX: 'auto' }}>
              {newMemberQr}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
