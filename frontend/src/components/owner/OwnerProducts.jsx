import React, { useState } from 'react';
import { Table } from 'antd';

export default function OwnerProducts({
  products,
  newProduct,
  setNewProduct,
  handleCreateProduct,
  handleUpdateProduct,
  handleDeleteProduct,
  actionLoading
}) {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', unit_price: '', sort_order: 100, active: true });

  const inputStyle = { padding: '6px', width: '100px', border: '1px solid #ccc', borderRadius: '4px' };

  const startEdit = (product) => {
    setEditingId(product.id);
    setEditForm({
      name: product.name,
      unit_price: product.unit_price,
      sort_order: product.sort_order ?? 100,
      active: !!product.active
    });
  };

  const saveEdit = async (id) => {
    const success = await handleUpdateProduct(id, {
      name: editForm.name,
      unit_price: Number(editForm.unit_price),
      sort_order: Number(editForm.sort_order),
      active: editForm.active
    });
    if (success) setEditingId(null);
  };

  const columns = [
    {
      title: 'Item',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
      width: 150,
      render: (text, record) => editingId === record.id ? (
        <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} style={inputStyle} />
      ) : (
        <span style={{ textTransform: 'capitalize', fontWeight: '600' }}>{text}</span>
      )
    },
    {
      title: 'Unit Price',
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: 120,
      render: (text, record) => editingId === record.id ? (
        <input type="number" value={editForm.unit_price} onChange={(e) => setEditForm({ ...editForm, unit_price: e.target.value })} style={inputStyle} />
      ) : (
        `${Number(text).toLocaleString()} RWF`
      )
    },
    {
      title: 'Report Order',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 110,
      render: (text, record) => editingId === record.id ? (
        <input type="number" value={editForm.sort_order} onChange={(e) => setEditForm({ ...editForm, sort_order: e.target.value })} style={{ ...inputStyle, width: '70px' }} />
      ) : (text ?? 100)
    },
    {
      title: 'On Sale?',
      key: 'active',
      width: 100,
      render: (_, record) => editingId === record.id ? (
        <input type="checkbox" checked={editForm.active} onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })} />
      ) : (record.active ? 'Yes' : 'Retired')
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => editingId === record.id ? (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-primary btn-small" onClick={() => saveEdit(record.id)} disabled={actionLoading} style={{ padding: '4px 8px' }}>Save</button>
          <button className="btn-secondary btn-small" onClick={() => setEditingId(null)} disabled={actionLoading} style={{ padding: '4px 8px' }}>Cancel</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-secondary btn-small" onClick={() => startEdit(record)} disabled={actionLoading} style={{ padding: '4px 8px' }}>Edit</button>
          <button className="btn-secondary btn-small" style={{ color: '#dc2626', borderColor: '#fca5a5', padding: '4px 8px' }} onClick={() => handleDeleteProduct(record.id)} disabled={actionLoading}>Delete</button>
        </div>
      )
    }
  ];

  return (
    <div className="products-tab">
      <div className="grid grid-2">
        <div className="card" style={{ overflowX: 'auto' }}>
          <h2 className="card-title">Shop Items</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '15px' }}>
            Anything sold at the counter rather than checked in — water, towels and the like. These appear as their own lines at the bottom of the daily report.
          </p>
          <Table
            columns={columns}
            dataSource={products.map((p, i) => ({ ...p, key: p.id || i }))}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 'max-content' }}
            size="middle"
          />
        </div>

        <div className="card">
          <h2 className="card-title">Add Shop Item</h2>
          <form onSubmit={handleCreateProduct} className="form-stack">
            <div className="form-group">
              <label>Item Name (e.g. amazi, gang)</label>
              <input
                type="text"
                placeholder="Enter item name"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Unit Price (RWF)</label>
              <input
                type="number"
                placeholder="Price for one"
                value={newProduct.unit_price}
                onChange={(e) => setNewProduct({ ...newProduct, unit_price: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Report Order</label>
              <input
                type="number"
                placeholder="100"
                value={newProduct.sort_order}
                onChange={(e) => setNewProduct({ ...newProduct, sort_order: e.target.value })}
              />
              <small style={{ color: 'var(--text-secondary)' }}>Lower numbers are listed first in the daily report.</small>
            </div>
            <button className="btn-primary" type="submit" disabled={actionLoading} style={{ width: '100%', marginTop: '10px' }}>
              {actionLoading ? 'Processing...' : 'Add Item'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
