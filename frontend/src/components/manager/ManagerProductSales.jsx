import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../store/authStore.js';

const rwf = (value) => `${Math.round(Number(value) || 0).toLocaleString()} RWF`;

export default function ManagerProductSales() {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState({ product_id: '', quantity: '1', unit_price: '', payment_method: 'Cash' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const fetchSales = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/products/sales?date=${date}`);
      setSales(response.data.sales || []);
      setTotal(response.data.total || 0);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load sales');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await api.get('/products');
        const list = (response.data.products || []).filter(p => p.active);
        setProducts(list);
        if (list.length > 0) {
          setForm(f => (f.product_id ? f : { ...f, product_id: list[0].id, unit_price: String(list[0].unit_price) }));
        }
      } catch (err) {
        console.warn('Could not load products:', err.message || err);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const handleSelectProduct = (productId) => {
    const product = products.find(p => p.id === productId);
    setForm({ ...form, product_id: productId, unit_price: product ? String(product.unit_price) : '' });
  };

  const handleRecord = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!form.product_id) {
      setError('Pick an item first');
      return;
    }

    try {
      setSaving(true);
      await api.post('/products/sales', {
        product_id: form.product_id,
        quantity: Number(form.quantity) || 1,
        unit_price: form.unit_price === '' ? undefined : Number(form.unit_price),
        payment_method: form.payment_method,
        date
      });
      setMessage('Sale recorded');
      setTimeout(() => setMessage(null), 3000);
      setForm({ ...form, quantity: '1' });
      fetchSales();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record the sale');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (saleId) => {
    setError(null);
    try {
      await api.delete(`/products/sales/${saleId}`);
      fetchSales();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove the sale');
    }
  };

  const selectedProduct = products.find(p => p.id === form.product_id);
  const previewAmount = (Number(form.unit_price) || 0) * (Number(form.quantity) || 0);

  return (
    <div className="grid grid-2">
      <div className="card">
        <h2 className="card-title">Record a sale</h2>

        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        {products.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            No items have been set up yet. Ask the owner to add them under Manage Shop Items.
          </p>
        ) : (
          <form onSubmit={handleRecord} className="form-stack">
            <div className="form-group">
              <label>Item</label>
              <select value={form.product_id} onChange={(e) => handleSelectProduct(e.target.value)}>
                {products.map(p => (
                  <option key={p.id} value={p.id} style={{ textTransform: 'capitalize' }}>
                    {p.name} — {rwf(p.unit_price)}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 1, minWidth: '120px' }}>
                <label>Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ flex: 1, minWidth: '120px' }}>
                <label>Unit price (RWF)</label>
                <input
                  type="number"
                  value={form.unit_price}
                  placeholder={selectedProduct ? String(selectedProduct.unit_price) : ''}
                  onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Paid with</label>
              <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
                <option value="Cash">Cash</option>
                <option value="MOMO">MOMO</option>
              </select>
            </div>

            <div className="pricing-preview-panel" style={{ padding: '12px', borderRadius: '8px', background: 'var(--bg-light)' }}>
              <div className="pricing-final-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total</span>
                <strong>{rwf(previewAmount)}</strong>
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={saving}>
              {saving ? 'Recording...' : 'Record sale'}
            </button>
          </form>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '15px', flexWrap: 'wrap', marginBottom: '15px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Sales on</label>
            <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div className="summary-label">Day total</div>
            <div className="summary-value">{rwf(total)}</div>
          </div>
        </div>

        {loading ? (
          <div className="text-center" style={{ padding: '30px' }}><div className="spinner"></div></div>
        ) : sales.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Nothing sold on this date yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '8px 4px' }}>Item</th>
                <th style={{ padding: '8px 4px' }}>Qty</th>
                <th style={{ padding: '8px 4px' }}>Amount</th>
                <th style={{ padding: '8px 4px' }}>Paid</th>
                <th style={{ padding: '8px 4px' }}></th>
              </tr>
            </thead>
            <tbody>
              {sales.map(sale => (
                <tr key={sale.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '8px 4px', textTransform: 'capitalize' }}>{sale.product_name}</td>
                  <td style={{ padding: '8px 4px' }}>{sale.quantity}</td>
                  <td style={{ padding: '8px 4px' }}>{rwf(sale.amount)}</td>
                  <td style={{ padding: '8px 4px' }}>{sale.payment_method}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn-secondary btn-small"
                      style={{ color: '#dc2626', borderColor: '#fca5a5', padding: '4px 8px' }}
                      onClick={() => handleRemove(sale.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
