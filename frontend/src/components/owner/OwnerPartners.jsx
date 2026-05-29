import React, { useState, useEffect } from 'react';
import { api } from '../../store/authStore';
import { Edit2, Trash2 } from 'lucide-react';

export default function OwnerPartners({ setError, setMessage }) {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '' });

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
