import React, { useState, useEffect } from 'react';
import { api } from '../../store/authStore.js';

export default function ManagerDailyReport({ dashboardData, date }) {
  const [noteData, setNoteData] = useState({ note: '', momo_balance: '', cash_balance: '' });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchClosingNote();
  }, [date]);

  const fetchClosingNote = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/dashboard/closing-note?date=${date || ''}`);
      if (response.data.note) {
        setNoteData({
          note: response.data.note.note || '',
          momo_balance: response.data.note.momo_balance || '',
          cash_balance: response.data.note.cash_balance || ''
        });
      } else {
        setNoteData({ note: '', momo_balance: '', cash_balance: '' });
      }
    } catch (err) {
      console.warn('Could not load closing note:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      
      const payload = {
        date,
        note: noteData.note,
        momo_balance: noteData.momo_balance ? Number(noteData.momo_balance) : 0,
        cash_balance: noteData.cash_balance ? Number(noteData.cash_balance) : 0
      };

      await api.post('/dashboard/closing-note', payload);
      setMessage('Closing note saved successfully!');
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save closing note');
      setTimeout(() => setError(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center" style={{ padding: '40px' }}><div className="spinner"></div></div>;
  }

  const summary = dashboardData?.summary || {};

  return (
    <div className="card" style={{ padding: '20px' }}>
      <h3 style={{ marginBottom: '20px' }}>Daily Closing Note ({date || new Date().toISOString().split('T')[0]})</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: 'var(--bg-color)', padding: '15px', borderRadius: '8px' }}>
          <h4>Today's Summary</h4>
          <ul style={{ listStyle: 'none', padding: 0, marginTop: '10px' }}>
            <li style={{ marginBottom: '5px' }}>Total Check-ins: <strong>{summary.checkins_today || 0}</strong></li>
            <li style={{ marginBottom: '5px' }}>Total Revenue: <strong>{Number(summary.revenue_today || 0).toLocaleString()} RWF</strong></li>
            <li style={{ marginBottom: '5px' }}>Momo Revenue: <strong>{Number(summary.momo_revenue_today || 0).toLocaleString()} RWF</strong></li>
            <li style={{ marginBottom: '5px' }}>Cash Revenue: <strong>{Number(summary.cash_revenue_today || 0).toLocaleString()} RWF</strong></li>
          </ul>
        </div>
      </div>

      <form onSubmit={handleSave}>
        {message && <div className="alert alert-success" style={{ marginBottom: '15px' }}>{message}</div>}
        {error && <div className="alert alert-error" style={{ marginBottom: '15px' }}>{error}</div>}
        
        <div className="form-group" style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          <div style={{ flex: 1 }}>
            <label>Actual Momo Balance (RWF)</label>
            <input 
              type="number" 
              className="input-field" 
              placeholder="e.g. 176567"
              value={noteData.momo_balance}
              onChange={(e) => setNoteData({...noteData, momo_balance: e.target.value})}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label>Actual Cash Balance (RWF)</label>
            <input 
              type="number" 
              className="input-field" 
              placeholder="e.g. 50000"
              value={noteData.cash_balance}
              onChange={(e) => setNoteData({...noteData, cash_balance: e.target.value})}
            />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label>Closing Note (N.B)</label>
          <textarea 
            className="input-field" 
            placeholder="Add any specific notes about today's operations, partial payments, cash sent to Momo, etc."
            rows="6"
            value={noteData.note}
            onChange={(e) => setNoteData({...noteData, note: e.target.value})}
          ></textarea>
        </div>

        <button 
          type="submit" 
          className="btn btn-primary" 
          style={{ width: '100%', padding: '12px' }}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Closing Note'}
        </button>
      </form>
    </div>
  );
}
