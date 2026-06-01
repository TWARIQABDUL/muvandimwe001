import React, { useState, useEffect } from 'react';
import { api } from '../../store/authStore.js';
import { Download, RefreshCw, Plus, Share2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Table } from 'antd';

export default function OwnerCards({ setError, setMessage }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generateCount, setGenerateCount] = useState(100);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      setLoading(true);
      const response = await api.get('/cards');
      setCards(response.data.cards || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch cards');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    
    if (generateCount < 1 || generateCount > 1000) {
      setError('Please enter a number between 1 and 1000');
      return;
    }

    try {
      setActionLoading(true);
      const response = await api.post('/cards/generate', { count: generateCount });
      setMessage(response.data.message);
      setGenerateCount(100);
      fetchCards();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate cards');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCSV = async () => {
    const unassigned = cards.filter(c => c.status === 'unassigned');
    if (unassigned.length === 0) {
      setError('No unassigned cards to export.');
      return;
    }

    const csvContent = "QR Code ID,Status,Created At\n" 
      + unassigned.map(c => `${c.id},${c.status},${new Date(c.created_at).toLocaleDateString()}`).join("\n");

    const fileName = `unassigned_qr_cards_${new Date().toISOString().split('T')[0]}.csv`;

    try {
      if (Capacitor.isNativePlatform()) {
        // Mobile: Save to device and Share natively
        const writeResult = await Filesystem.writeFile({
          path: fileName,
          data: csvContent,
          directory: Directory.Cache,
          encoding: Encoding.UTF8
        });
        
        await Share.share({
          title: 'Unused QR Cards',
          text: 'Here are the unassigned QR cards for printing.',
          url: writeResult.uri,
          dialogTitle: 'Share CSV'
        });
        setMessage(`Successfully shared ${unassigned.length} unassigned cards.`);
      } else {
        // Web: HTML5 Download
        const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setMessage(`Successfully exported ${unassigned.length} unassigned cards.`);
      }
    } catch (err) {
      console.error("Export Error:", err);
      setError("Failed to export the CSV file.");
    }
  };

  const stats = {
    total: cards.length,
    assigned: cards.filter(c => c.status === 'assigned').length,
    unassigned: cards.filter(c => c.status === 'unassigned').length
  };

  return (
    <div className="fade-in">
      <div className="flex-between mb-20">
        <h2>Card Inventory Management</h2>
        <button 
          onClick={handleExportCSV} 
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Download size={18} /> Export Unassigned CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-3" style={{ marginBottom: '30px', gap: '20px' }}>
        <div className="card" style={{ padding: '20px', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
          <div style={{ color: '#64748b', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase' }}>Total Generated</div>
          <div style={{ fontSize: '36px', fontWeight: '800', color: '#0f172a', marginTop: '10px' }}>{stats.total.toLocaleString()}</div>
        </div>
        <div className="card" style={{ padding: '20px', background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce3 100%)', border: '1px solid #bbf7d0', borderRadius: '12px' }}>
          <div style={{ color: '#166534', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase' }}>Assigned Cards</div>
          <div style={{ fontSize: '36px', fontWeight: '800', color: '#15803d', marginTop: '10px' }}>{stats.assigned.toLocaleString()}</div>
        </div>
        <div className="card" style={{ padding: '20px', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '1px solid #bfdbfe', borderRadius: '12px' }}>
          <div style={{ color: '#1e40af', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase' }}>Available Inventory</div>
          <div style={{ fontSize: '36px', fontWeight: '800', color: '#1d4ed8', marginTop: '10px' }}>{stats.unassigned.toLocaleString()}</div>
        </div>
      </div>

      {/* Generation Form */}
      <div className="card" style={{ marginBottom: '30px', padding: '30px' }}>
        <h3 style={{ marginBottom: '20px', fontSize: '18px' }}>Generate New Cards</h3>
        <p style={{ color: '#64748b', marginBottom: '20px' }}>Specify how many secure UUIDs you want to generate. Once generated, export the CSV and send it to your printing company to produce physical QR cards.</p>
        <form onSubmit={handleGenerate} style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ margin: 0, flex: 1, maxWidth: '200px' }}>
            <label>Number of Cards</label>
            <input 
              type="number" 
              min="1" 
              max="1000" 
              value={generateCount}
              onChange={(e) => setGenerateCount(Number(e.target.value))}
              required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={actionLoading} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}>
            {actionLoading ? <RefreshCw size={18} className="spin" /> : <Plus size={18} />}
            Generate Inventory
          </button>
        </form>
      </div>

      {/* Inventory Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>Card Inventory Logs</h3>
          <button onClick={fetchCards} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
        
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            <div className="spinner" style={{ margin: '0 auto 15px' }}></div>
            Loading inventory...
          </div>
        ) : cards.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
            No cards have been generated yet.
          </div>
        ) : (
          <div style={{ maxHeight: '600px' }}>
            <Table 
              columns={[
                { 
                  title: 'Card UUID', 
                  dataIndex: 'id', 
                  key: 'id', 
                  fixed: 'left', 
                  width: 150, 
                  render: text => <code style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', color: '#334155' }}>{text}</code> 
                },
                { 
                  title: 'Status', 
                  key: 'status', 
                  width: 120, 
                  render: (_, card) => (
                    <span className={`status-badge ${card.status === 'assigned' ? 'status-active' : 'status-inactive'}`} style={{
                      background: card.status === 'assigned' ? '#dcfce3' : '#e2e8f0',
                      color: card.status === 'assigned' ? '#166534' : '#475569',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600',
                      textTransform: 'uppercase'
                    }}>
                      {card.status}
                    </span>
                  ) 
                },
                { 
                  title: 'Assigned To', 
                  key: 'assigned_member_name', 
                  width: 150, 
                  render: (_, card) => (
                    <span style={{ fontWeight: '500', color: card.assigned_member_name ? '#0f172a' : '#94a3b8' }}>
                      {card.assigned_member_name || '--'}
                    </span>
                  ) 
                },
                { 
                  title: 'Generated Date', 
                  dataIndex: 'created_at', 
                  key: 'created_at', 
                  width: 150, 
                  render: text => <span style={{ color: '#64748b', fontSize: '13px' }}>{new Date(text).toLocaleString()}</span> 
                }
              ]}
              dataSource={cards.map((c, i) => ({ ...c, key: c.id || i }))}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 'max-content' }}
              size="middle"
            />
          </div>
        )}
      </div>
    </div>
  );
}
