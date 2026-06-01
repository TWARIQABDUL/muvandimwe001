import React, { useState, useEffect } from 'react';
import { api } from '../../store/authStore';
import { Edit2, Trash2, FileText, X, ArrowLeft, Download } from 'lucide-react';

export default function OwnerPartners({ setError, setMessage }) {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '' });

  // Report State
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [billingMonth, setBillingMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [billingReport, setBillingReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      const response = await api.get('/employers');
      setPartners(response.data.employers || []);
    } catch (err) {
      console.error('Failed to load partners:', err);
      if (setError) setError('Failed to load partner organizations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPartner) {
      fetchBillingReport(selectedPartner.id, billingMonth);
    }
  }, [selectedPartner, billingMonth]);

  const fetchBillingReport = async (partnerId, month) => {
    setReportLoading(true);
    try {
      const response = await api.get(`/employers/${partnerId}/billing?month=${month}`);
      setBillingReport(response.data);
    } catch (err) {
      console.error('Failed to generate report:', err);
      if (setError) setError('Failed to generate billing report');
    } finally {
      setReportLoading(false);
    }
  };

  const handleGenerateReport = (partner) => {
    setSelectedPartner(partner);
  };

  const exportToCSV = () => {
    if (!billingReport || !billingReport.report) return;
    const headers = ['Date', 'Member Name', 'Service', 'Cost (RWF)'];
    const rows = billingReport.report.map(r => [
      new Date(r.date).toLocaleDateString(),
      `"${r.member_name}"`,
      `"${r.service}"`,
      r.cost
    ]);
    rows.push(['', '', 'Grand Total', billingReport.total_cost || 0]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${selectedPartner.name.replace(/\s+/g, '_')}_billing_${billingMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (setError) setError(null);
    if (setMessage) setMessage(null);

    if (!form.name.trim()) {
      if (setError) setError('Organization name is required');
      return;
    }

    try {
      setActionLoading(true);
      if (editingId) {
        await api.patch(`/employers/${editingId}`, {
          name: form.name.trim(),
          phone: form.phone.trim()
        });
        if (setMessage) setMessage(`Partner updated successfully!`);
      } else {
        await api.post('/employers', {
          name: form.name.trim(),
          phone: form.phone.trim()
        });
        if (setMessage) setMessage(`Partner created successfully!`);
      }
      setForm({ name: '', phone: '' });
      setEditingId(null);
      fetchPartners();
      setTimeout(() => { if (setMessage) setMessage(null); }, 3000);
    } catch (err) {
      if (setError) setError(err.response?.data?.error || 'Failed to save partner organization');
      setTimeout(() => { if (setError) setError(null); }, 3000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = (partner) => {
    setEditingId(partner.id);
    setForm({
      name: partner.name,
      phone: partner.phone || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm({ name: '', phone: '' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this partner organization?')) return;
    
    if (setError) setError(null);
    if (setMessage) setMessage(null);
    
    try {
      setActionLoading(true);
      await api.delete(`/employers/${id}`);
      if (setMessage) setMessage('Partner deleted successfully!');
      fetchPartners();
      setTimeout(() => { if (setMessage) setMessage(null); }, 3000);
    } catch (err) {
      if (setError) setError(err.response?.data?.error || 'Failed to delete partner organization');
      setTimeout(() => { if (setError) setError(null); }, 3000);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading partners...</div>;

  if (selectedPartner) {
    return (
      <div className="card" id="print-area">
        <div className="flex-between" style={{ marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px' }}>
          <div>
            <button 
              onClick={() => setSelectedPartner(null)}
              className="btn-secondary btn-small"
              style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <ArrowLeft size={16} /> Back to Partners
            </button>
            <h2 className="card-title" style={{ margin: 0 }}>Billing Report: {selectedPartner.name}</h2>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Billing Month</label>
              <input 
                type="month" 
                value={billingMonth} 
                onChange={(e) => setBillingMonth(e.target.value)} 
                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
              />
            </div>
            <button onClick={exportToCSV} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Download size={16} /> Export CSV
            </button>
            <button onClick={() => window.print()} className="btn-primary">
              Print / PDF
            </button>
          </div>
        </div>

        {reportLoading ? (
          <div className="p-8 text-center text-gray-500">Loading report data...</div>
        ) : billingReport ? (
          <div>
            {billingReport.report && billingReport.report.length > 0 ? (
              <>
                <table className="w-full text-left border-collapse" style={{ marginBottom: '20px' }}>
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100">
                      <th className="p-3 font-semibold text-gray-600 text-sm">Date</th>
                      <th className="p-3 font-semibold text-gray-600 text-sm">Member</th>
                      <th className="p-3 font-semibold text-gray-600 text-sm">Service</th>
                      <th className="p-3 font-semibold text-gray-600 text-sm text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingReport.report.map((row) => (
                      <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="p-3 text-gray-700" style={{ whiteSpace: 'nowrap' }}>
                          {new Date(row.date).toLocaleDateString()}
                        </td>
                        <td className="p-3 font-medium text-gray-900">{row.member_name}</td>
                        <td className="p-3 text-gray-700" style={{ textTransform: 'capitalize' }}>{row.service}</td>
                        <td className="p-3 text-right font-medium text-gray-900">
                          {row.cost.toLocaleString()} RWF
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '15px', background: '#f8fafc', borderRadius: '8px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '14px', marginRight: '10px' }}>Grand Total</span>
                    <span style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                      {billingReport.total_cost?.toLocaleString()} RWF
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-gray-500">
                No check-ins recorded for this partner in {billingMonth}.
              </div>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid grid-2">
      <div className="card" style={{ overflowX: 'auto' }}>
        <h2 className="card-title">Registered Partner Organizations</h2>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100">
              <th className="p-4 font-semibold text-gray-600 text-sm">Organization Name</th>
              <th className="p-4 font-semibold text-gray-600 text-sm">Phone Number</th>
              <th className="p-4 font-semibold text-gray-600 text-sm text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {partners.length === 0 ? (
              <tr>
                <td colSpan="3" className="p-8 text-center text-gray-500">
                  No partner organizations created yet.
                </td>
              </tr>
            ) : (
              partners.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 font-medium text-gray-900">{p.name}</td>
                  <td className="p-4 text-gray-700">{p.phone || 'N/A'}</td>
                  <td className="p-4">
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        onClick={() => handleGenerateReport(p)}
                        className="btn-secondary btn-small"
                        style={{ padding: '6px' }}
                        title="Billing Report"
                        disabled={actionLoading}
                      >
                        <FileText size={16} color="var(--primary-color)" />
                      </button>
                      <button
                        onClick={() => handleEdit(p)}
                        className="btn-secondary btn-small"
                        style={{ padding: '6px' }}
                        title="Edit"
                        disabled={actionLoading}
                      >
                        <Edit2 size={16} color="var(--primary-color)" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="btn-secondary btn-small"
                        style={{ padding: '6px', borderColor: 'var(--danger-color)' }}
                        title="Delete"
                        disabled={actionLoading}
                      >
                        <Trash2 size={16} color="var(--danger-color)" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="card h-fit">
        <h2 className="card-title">{editingId ? 'Edit Partner Organization' : 'Register New Partner'}</h2>
        <form onSubmit={handleSave} className="form-stack">
          <div className="form-group">
            <label>Organization Name</label>
            <input
              type="text"
              placeholder="e.g. MTN Rwanda"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Phone Number (Optional)</label>
            <input
              type="text"
              placeholder="e.g. 0780000000"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button className="btn-primary" type="submit" disabled={actionLoading} style={{ flex: 1 }}>
              {actionLoading ? 'Saving...' : (editingId ? 'Update Partner' : 'Register Partner')}
            </button>
            {editingId && (
              <button 
                className="btn-secondary" 
                type="button" 
                onClick={handleCancelEdit} 
                disabled={actionLoading}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

    </div>
  );
}
