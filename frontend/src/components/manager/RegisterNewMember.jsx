import React from 'react';

export default function RegisterNewMember({
  services,
  newMember,
  setNewMember,
  selectedServices,
  setSelectedServices,
  isCard,
  setIsCard,
  taps,
  setTaps,
  coupon,
  setCoupon,
  pricing,
  handleCreateMember,
  loading,
  newMemberQr
}) {
  return (
    <div className="register-tab">
      <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 className="card-title">Register New Member</h2>
        <form onSubmit={handleCreateMember} className="form-stack">
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
          
          <div className="form-group">
            <label>Phone (Optional)</label>
            <input
              type="text"
              placeholder="+250 788..."
              value={newMember.phone}
              onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
            />
          </div>

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
            <input
              type="text"
              placeholder="Enter coupon (10OFF, 15OFF, 20OFF)"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              style={{ textTransform: 'uppercase', marginTop: '10px' }}
            />
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

          <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: '30px', width: '100%', padding: '15px', fontSize: '16px' }}>
            {loading ? 'Processing...' : 'Register Member & Generate QR'}
          </button>
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
