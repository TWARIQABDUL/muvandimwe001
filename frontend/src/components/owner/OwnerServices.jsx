import React, { useState } from 'react';
import { Table } from 'antd';

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
          <Table 
            columns={[
              {
                title: 'Service Name',
                dataIndex: 'name',
                key: 'name',
                fixed: 'left',
                width: 150,
                render: (text, record) => editingId === record.id ? (
                  <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} style={{ padding: '6px', width: '100px', border: '1px solid #ccc', borderRadius: '4px' }} />
                ) : (
                  <span style={{ textTransform: 'capitalize', fontWeight: '600' }}>{text}</span>
                )
              },
              {
                title: 'Daily Price',
                dataIndex: 'price_daily',
                key: 'price_daily',
                width: 120,
                render: (text, record) => editingId === record.id ? (
                  <input type="number" value={editForm.price_daily} onChange={(e) => setEditForm({ ...editForm, price_daily: e.target.value })} style={{ padding: '6px', width: '100px', border: '1px solid #ccc', borderRadius: '4px' }} />
                ) : (
                  `${Number(text).toLocaleString()} RWF`
                )
              },
              {
                title: 'Monthly Price',
                dataIndex: 'price_monthly',
                key: 'price_monthly',
                width: 120,
                render: (text, record) => editingId === record.id ? (
                  <input type="number" value={editForm.price_monthly} onChange={(e) => setEditForm({ ...editForm, price_monthly: e.target.value })} style={{ padding: '6px', width: '100px', border: '1px solid #ccc', borderRadius: '4px' }} disabled={!editForm.allow_monthly} />
                ) : (
                  record.allow_monthly ? `${Number(text).toLocaleString()} RWF` : 'N/A'
                )
              },
              {
                title: 'Allow Monthly?',
                key: 'allow_monthly',
                width: 120,
                render: (_, record) => editingId === record.id ? (
                  <input type="checkbox" checked={editForm.allow_monthly} onChange={(e) => setEditForm({ ...editForm, allow_monthly: e.target.checked })} />
                ) : (
                  record.allow_monthly ? 'Yes' : 'No'
                )
              },
              {
                title: 'Actions',
                key: 'actions',
                width: 150,
                render: (_, record) => editingId === record.id ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-primary btn-small" onClick={() => saveEdit(record.id)} disabled={actionLoading} style={{ padding: '4px 8px' }}>Save</button>
                    <button className="btn-secondary btn-small" onClick={cancelEdit} disabled={actionLoading} style={{ padding: '4px 8px' }}>Cancel</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-secondary btn-small" onClick={() => startEdit(record)} disabled={actionLoading} style={{ padding: '4px 8px' }}>Edit</button>
                    <button className="btn-secondary btn-small" style={{ color: '#dc2626', borderColor: '#fca5a5', padding: '4px 8px' }} onClick={() => handleDeleteService(record.id)} disabled={actionLoading}>Delete</button>
                  </div>
                )
              }
            ]}
            dataSource={services.map((s, i) => ({ ...s, key: s.id || i }))}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 'max-content' }}
            size="middle"
          />
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
