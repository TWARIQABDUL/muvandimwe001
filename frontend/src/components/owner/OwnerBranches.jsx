import React, { useState, useEffect } from 'react';
import { Table, Modal, Form, Input, Button } from 'antd';
import { api } from '../../store/authStore.js';

export default function OwnerBranches() {
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchGyms();
  }, []);

  const fetchGyms = async () => {
    setLoading(true);
    try {
      const res = await api.get('/gyms');
      setGyms(res.data.gyms || []);
    } catch (err) {
      console.error('Failed to fetch gyms:', err);
      setError('Failed to load branches.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (values) => {
    setCreating(true);
    setError(null);
    setMessage(null);
    try {
      await api.post('/gyms', values);
      setMessage(`Branch "${values.name}" created successfully!`);
      setIsModalVisible(false);
      form.resetFields();
      fetchGyms();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create branch');
      setTimeout(() => setError(null), 3000);
    } finally {
      setCreating(false);
    }
  };

  const columns = [
    {
      title: 'Branch Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: 'Country',
      dataIndex: 'country',
      key: 'country',
    },
    {
      title: 'Manager Username',
      dataIndex: 'manager_email',
      key: 'manager_email',
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => new Date(text).toLocaleDateString(),
    },
  ];

  return (
    <div className="card">
      <div className="flex-between" style={{ marginBottom: '20px' }}>
        <h2 className="card-title" style={{ margin: 0 }}>Manage Branches</h2>
        <Button type="primary" onClick={() => setIsModalVisible(true)}>
          + Create New Branch
        </Button>
      </div>

      {message && <div className="alert alert-success" style={{ marginBottom: '20px' }}>{message}</div>}
      {error && <div className="alert alert-error" style={{ marginBottom: '20px' }}>{error}</div>}

      <Table
        dataSource={gyms.map(g => ({ ...g, key: g.id }))}
        columns={columns}
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 'max-content' }}
      />

      <Modal
        title="Create New Gym Branch"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        <p style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
          Creating a new branch will automatically set up default services, packages, and a manager account for the branch.
        </p>
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="name" label="Branch Name" rules={[{ required: true, message: 'Please enter branch name' }]}>
            <Input placeholder="e.g. Downtown Fitness Center" />
          </Form.Item>
          <Form.Item name="location" label="City / Location" rules={[{ required: true }]}>
            <Input placeholder="e.g. Kigali City" />
          </Form.Item>
          <Form.Item name="country" label="Country" rules={[{ required: true }]}>
            <Input placeholder="e.g. Rwanda" />
          </Form.Item>
          <div style={{ borderTop: '1px solid #eee', margin: '20px 0', paddingTop: '10px' }}>
            <h4 style={{ marginBottom: '10px' }}>Manager Account Details</h4>
            <Form.Item name="manager_username" label="Manager Username" rules={[{ required: true }]}>
              <Input placeholder="e.g. branch1_mgr" />
            </Form.Item>
            <Form.Item name="manager_password" label="Manager Password" rules={[{ required: true }]}>
              <Input.Password placeholder="Enter a secure password" />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button onClick={() => setIsModalVisible(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={creating}>
              Create Branch
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
