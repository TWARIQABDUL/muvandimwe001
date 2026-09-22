import React, { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { api } from '../store/authStore.js';

const rwf = (value) => `${Math.round(Number(value) || 0).toLocaleString()} RWF`;

// One block of the report: the text plus the buttons that send it on.
function MessageBlock({ title, text, hint }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const area = document.createElement('textarea');
        area.value = text;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        document.body.removeChild(area);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  };

  const handleShare = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await Share.share({ title, text, dialogTitle: 'Send report' });
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
      }
    } catch (err) {
      console.warn('Share cancelled or failed:', err);
    }
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <div>
          <strong style={{ fontSize: '14px' }}>{title}</strong>
          {hint && <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{hint}</div>}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="btn-secondary btn-small" onClick={handleCopy}>
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button type="button" className="btn-primary btn-small" onClick={handleShare}>
            Send to WhatsApp
          </button>
        </div>
      </div>
      <pre
        style={{
          background: 'var(--bg-light)',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '8px',
          padding: '14px',
          margin: 0,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: '13px',
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          color: 'var(--text-primary)'
        }}
      >
        {text}
      </pre>
    </div>
  );
}

// `readOnly` is what the owner sees: the same report, without the balance entry form.
export default function DailyReport({ date: initialDate, readOnly = false }) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(initialDate || today);
  const [report, setReport] = useState(null);
  const [messages, setMessages] = useState(null);
  const [noteData, setNoteData] = useState({ note: '', momo_balance: '', cash_balance: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [reportRes, noteRes] = await Promise.all([
        api.get(`/dashboard/daily-report?date=${date}`),
        api.get(`/dashboard/closing-note?date=${date}`)
      ]);

      setReport(reportRes.data.report);
      setMessages(reportRes.data.messages);

      const note = noteRes.data.note;
      setNoteData({
        note: note?.note || '',
        momo_balance: note?.momo_balance ?? '',
        cash_balance: note?.cash_balance ?? ''
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load the daily report');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      await api.post('/dashboard/closing-note', {
        date,
        note: noteData.note,
        momo_balance: noteData.momo_balance === '' ? 0 : Number(noteData.momo_balance),
        cash_balance: noteData.cash_balance === '' ? 0 : Number(noteData.cash_balance)
      });

      setMessage('Balances saved. The report below has been updated.');
      setTimeout(() => setMessage(null), 4000);
      // The momo figures are printed in the report, so rebuild it.
      await fetchReport();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save the closing note');
      setTimeout(() => setError(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card text-center" style={{ padding: '60px 20px' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '10px' }}>Building the report...</p>
      </div>
    );
  }

  const totals = report?.totals || {};
  const balances = report?.balances || {};
  const lastBalance = Number(balances.last_balance) || 0;
  const expectedMomo = lastBalance + (Number(totals.momo) || 0);
  const actualMomo = noteData.momo_balance === '' ? null : Number(noteData.momo_balance);
  const variance = actualMomo === null ? null : actualMomo - expectedMomo;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '15px', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Report date</label>
            <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
          </div>
          <button type="button" className="btn-secondary" onClick={() => setDate(today)} disabled={date === today}>
            Today
          </button>
          <button type="button" className="btn-secondary" onClick={fetchReport}>
            Refresh
          </button>
        </div>

        <div className="grid grid-4" style={{ marginTop: '20px' }}>
          <div className="summary-card">
            <div className="summary-label">Services</div>
            <div className="summary-value">{rwf(totals.services)}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Shop sales</div>
            <div className="summary-value">{rwf(totals.products)}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Day total</div>
            <div className="summary-value">{rwf(totals.grand_total)}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Cash / Momo</div>
            <div className="summary-value" style={{ fontSize: '15px' }}>
              {rwf(totals.cash)} / {rwf(totals.momo)}
            </div>
          </div>
        </div>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {readOnly ? (
        <div className="card" style={{ padding: '20px' }}>
          <h3 className="card-title">Closing balances</h3>
          <div className="grid grid-3">
            <div>
              <div className="summary-label">Yesterday's Momo</div>
              <div className="summary-value">{balances.last_balance === null ? 'Not recorded' : rwf(balances.last_balance)}</div>
            </div>
            <div>
              <div className="summary-label">Today's Momo</div>
              <div className="summary-value">{balances.today_momo === null ? 'Not recorded' : rwf(balances.today_momo)}</div>
            </div>
            <div>
              <div className="summary-label">Cash in hand</div>
              <div className="summary-value">{balances.cash_balance === null ? 'Not recorded' : rwf(balances.cash_balance)}</div>
            </div>
          </div>
          {variance !== null && variance !== 0 && (
            <div className={`alert ${Math.abs(variance) > 1000 ? 'alert-error' : 'alert-warning'}`} style={{ marginTop: '15px', marginBottom: 0 }}>
              The recorded Momo balance is {rwf(Math.abs(variance))} {variance > 0 ? 'above' : 'below'} what the day's takings predict.
            </div>
          )}
          {report?.note && (
            <div style={{ marginTop: '15px' }}>
              <div className="summary-label">Closing note</div>
              <p style={{ fontSize: '14px', whiteSpace: 'pre-wrap' }}>{report.note}</p>
            </div>
          )}
        </div>
      ) : (
      <div className="card" style={{ padding: '20px' }}>
        <h3 className="card-title">Closing balances</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '15px' }}>
          Yesterday's closing Momo was <strong>{balances.last_balance === null ? 'not recorded' : rwf(balances.last_balance)}</strong>.
          With today's {rwf(totals.momo)} received on Momo, the account should read <strong>{rwf(expectedMomo)}</strong>.
        </p>

        <form onSubmit={handleSave}>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '15px' }}>
            <div className="form-group" style={{ flex: 1, minWidth: '180px' }}>
              <label>Today's Momo balance (RWF)</label>
              <input
                type="number"
                placeholder={String(Math.round(expectedMomo))}
                value={noteData.momo_balance}
                onChange={(e) => setNoteData({ ...noteData, momo_balance: e.target.value })}
              />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: '180px' }}>
              <label>Cash in hand (RWF)</label>
              <input
                type="number"
                placeholder="e.g. 50000"
                value={noteData.cash_balance}
                onChange={(e) => setNoteData({ ...noteData, cash_balance: e.target.value })}
              />
            </div>
          </div>

          {variance !== null && variance !== 0 && (
            <div className={`alert ${Math.abs(variance) > 1000 ? 'alert-error' : 'alert-warning'}`} style={{ marginBottom: '15px' }}>
              The balance you entered is {rwf(Math.abs(variance))} {variance > 0 ? 'above' : 'below'} what the day's takings predict.
            </div>
          )}

          <div className="form-group">
            <label>Closing note (N.B)</label>
            <textarea
              placeholder="Partial payments, cash moved to Momo, anything the owner should know."
              rows="4"
              value={noteData.note}
              onChange={(e) => setNoteData({ ...noteData, note: e.target.value })}
            ></textarea>
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px' }} disabled={saving}>
            {saving ? 'Saving...' : 'Save balances'}
          </button>
        </form>
      </div>
      )}

      <div className="card" style={{ padding: '20px' }}>
        <h3 className="card-title">Report to send</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Built from the day's check-ins, sign-ups and shop sales.{readOnly ? '' : ' Send each block as its own message, the way the report has always gone out.'}
        </p>

        {messages?.summary && (
          <MessageBlock title="1. Daily summary" text={messages.summary} />
        )}
        {messages?.details && (
          <MessageBlock
            title="2. Service breakdown"
            hint="Who received what, for services priced individually"
            text={messages.details}
          />
        )}
        {messages?.vip && (
          <MessageBlock
            title="3. VIP signatures"
            hint="Card and partner members, with the services they signed for"
            text={messages.vip}
          />
        )}
      </div>
    </div>
  );
}
