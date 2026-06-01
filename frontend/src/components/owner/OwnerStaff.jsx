import React, { useState, useEffect } from 'react';
import { api } from '../../store/authStore.js';
import { Table } from 'antd';

export default function OwnerStaff({ setError, setMessage }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState(null);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      setStaff(response.data.users || []);
    } catch (err) {
      setError?.(err.response?.data?.error || 'Failed to fetch staff members');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterStaff = async (e) => {
    e.preventDefault();
    if (!newStaffEmail.trim()) {
      setError?.('Email is required');
      return;
    }

    try {
      setActionLoading(true);
      setTemporaryPassword(null);
      const response = await api.post('/users', { email: newStaffEmail.trim() });
      setMessage?.('Employee registered successfully!');
      setTemporaryPassword(response.data.temporaryPassword);
      setNewStaffEmail('');
      fetchStaff();
    } catch (err) {
      setError?.(err.response?.data?.error || 'Failed to register employee');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteStaff = async (id) => {
    if (!window.confirm('Are you sure you want to remove this employee?')) return;

    try {
      setActionLoading(true);
      await api.delete(`/users/${id}`);
      setMessage?.('Employee removed successfully!');
      fetchStaff();
    } catch (err) {
      setError?.(err.response?.data?.error || 'Failed to remove employee');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card text-center" style={{ padding: '40px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Manage Staff</h2>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '15px' }}>Register New Employee</h3>
        <form onSubmit={handleRegisterStaff} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="email"
            value={newStaffEmail}
            onChange={(e) => setNewStaffEmail(e.target.value)}
            placeholder="employee@example.com"
            className="input"
            style={{ flex: 1 }}
            disabled={actionLoading}
          />
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={actionLoading}
          >
            {actionLoading ? 'Registering...' : 'Register Employee'}
          </button>
        </form>
        {temporaryPassword && (
          <div className="alert alert-success" style={{ marginTop: '15px' }}>
            <strong>Employee registered!</strong><br />
            Please share this temporary password with them: <code>{temporaryPassword}</code><br />
            They will be prompted to change it upon their first login.
          </div>
        )}
      </div>

      <div style={{ maxHeight: '600px' }}>
        <Table 
          columns={[
            { title: 'Email', dataIndex: 'email', key: 'email', fixed: 'left', width: 200 },
            { title: 'Role', dataIndex: 'role', key: 'role', width: 120, render: text => <span className="badge">{text}</span> },
            { title: 'Date Added', dataIndex: 'created_at', key: 'created_at', width: 150, render: text => new Date(text).toLocaleDateString() },
            { title: 'Actions', key: 'actions', width: 150, render: (_, user) => (
              <button 
                className="btn btn-outline" 
                onClick={() => handleDeleteStaff(user.id)}
                disabled={actionLoading}
              >
                Remove
              </button>
            ) }
          ]}
          dataSource={staff.map(user => ({ ...user, key: user.id }))}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
          size="middle"
        />
      </div>
    </div>
  );
}
