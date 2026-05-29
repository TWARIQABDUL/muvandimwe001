import React, { useState } from 'react';

export default function OwnerServices({
  services,
  newService,
  setNewService,
  handleCreateService,
  handleUpdateService,
  handleDeleteService,
  actionLoading
}) {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', price_daily: '', price_monthly: '', allow_monthly: true });

  const startEdit = (service) => {
    setEditingId(service.id);
    setEditForm({
      name: service.name,
      price_daily: service.price_daily,
      price_monthly: service.price_monthly,
      allow_monthly: service.allow_monthly === undefined ? true : !!service.allow_monthly
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id) => {
    const success = await handleUpdateService(id, {
      name: editForm.name,
      price_daily: Number(editForm.price_daily),
      price_monthly: Number(editForm.price_monthly),
      allow_monthly: editForm.allow_monthly
    });
    if (success) {
      setEditingId(null);
    }
  };

  return (
    <div className="services-tab">
      <div className="grid grid-2">
        <div className="card" style={{ overflowX: 'auto' }}>
          <h2 className="card-title">Current Services & Pricing</h2>
          <table>
            <thead>
              <tr>
                <th>Service Name</th>
                <th>Daily Price</th>
                <th>Monthly Price</th>
                <th>Allow Monthly?</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id}>
                  {editingId === s.id ? (
                    <>
                      <td>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          style={{ padding: '6px', width: '100px' }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={editForm.price_daily}
                          onChange={(e) => setEditForm({ ...editForm, price_daily: e.target.value })}
                          style={{ padding: '6px', width: '100px' }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={editForm.price_monthly}
                          onChange={(e) => setEditForm({ ...editForm, price_monthly: e.target.value })}
                          style={{ padding: '6px', width: '100px' }}
                          disabled={!editForm.allow_monthly}
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={editForm.allow_monthly}
                          onChange={(e) => setEditForm({ ...editForm, allow_monthly: e.target.checked })}
                        />
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className="btn-primary btn-small"
                            onClick={() => saveEdit(s.id)}
                            disabled={actionLoading}
                          >
                            Save
                          </button>
                          <button 
                            className="btn-secondary btn-small"
                            onClick={cancelEdit}
                            disabled={actionLoading}
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ textTransform: 'capitalize', fontWeight: '600' }}>{s.name}</td>
                      <td>{Number(s.price_daily).toLocaleString()} RWF</td>
                      <td>{s.allow_monthly ? `${Number(s.price_monthly).toLocaleString()} RWF` : 'N/A'}</td>
                      <td>{s.allow_monthly ? 'Yes' : 'No'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className="btn-secondary btn-small"
                            onClick={() => startEdit(s)}
                            disabled={actionLoading}
                          >
                            Edit
                          </button>
                          <button 
                            className="btn-secondary btn-small"
                            style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                            onClick={() => handleDeleteService(s.id)}
                            disabled={actionLoading}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {services.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center" style={{ padding: '20px', color: 'var(--text-secondary)' }}>
                    No services created yet. Add one to the right.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2 className="card-title">Add New Service Package</h2>
          <form onSubmit={handleCreateService} className="form-stack">
            <div className="form-group">
              <label>Service Name (e.g. sauna, massage, swimming)</label>
              <input
                type="text"
                placeholder="Enter service name"
                value={newService.name}
                onChange={(e) => setNewService({ ...newService, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Daily Walk-In Rate (RWF)</label>
              <input
                type="number"
                placeholder="Standard daily fee"
                value={newService.price_daily}
                onChange={(e) => setNewService({ ...newService, price_daily: e.target.value })}
              />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="checkbox"
                id="allowMonthly"
                checked={newService.allow_monthly}
                onChange={(e) => setNewService({ ...newService, allow_monthly: e.target.checked })}
              />
              <label htmlFor="allowMonthly" style={{ margin: 0 }}>Allow Monthly Subscription</label>
            </div>
            {newService.allow_monthly && (
              <div className="form-group">
                <label>Monthly Subscription Rate (RWF)</label>
                <input
                  type="number"
                  placeholder="Standard monthly subscription fee"
                  value={newService.price_monthly}
                  onChange={(e) => setNewService({ ...newService, price_monthly: e.target.value })}
                />
              </div>
            )}
            <button className="btn-primary" type="submit" disabled={actionLoading} style={{ width: '100%', marginTop: '10px' }}>
              {actionLoading ? 'Processing...' : 'Create Service Plan'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
