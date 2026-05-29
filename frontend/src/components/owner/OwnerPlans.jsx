import { useState, useEffect } from 'react';
import { api } from '../../store/authStore';
import { Plus, Edit2, Trash2, Check, X, ShieldAlert } from 'lucide-react';

export default function OwnerPlans({ services }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [currentPlanId, setCurrentPlanId] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [monthlyFee, setMonthlyFee] = useState('');
  const [selectedServices, setSelectedServices] = useState([]); // Array of service names

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await api.get('/plans');
      setPlans(res.data.plans);
    } catch (err) {
      console.error(err);
      setError('Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  const handleServiceToggle = (serviceName) => {
    setSelectedServices(prev => 
      prev.includes(serviceName) 
        ? prev.filter(s => s !== serviceName)
        : [...prev, serviceName]
    );
  };

  const resetForm = () => {
    setName('');
    setMonthlyFee('');
    setSelectedServices([]);
    setIsEditing(false);
    setCurrentPlanId(null);
    setError('');
  };

  const handleEdit = (plan) => {
    setName(plan.name);
    setMonthlyFee(plan.monthly_fee);
    setSelectedServices(plan.included_services ? plan.included_services.split(',') : []);
    setIsEditing(true);
    setCurrentPlanId(plan.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (selectedServices.length === 0) {
      setError('Please select at least one included service');
      return;
    }

    try {
      const payload = {
        name,
        monthly_fee: parseFloat(monthlyFee),
        included_services: selectedServices.join(',')
      };

      if (isEditing) {
        await api.patch(`/plans/${currentPlanId}`, payload);
        setSuccess('Package updated successfully');
      } else {
        await api.post('/plans', payload);
        setSuccess('Package created successfully');
      }

      resetForm();
      fetchPlans();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save package');
    }
  };

  const toggleActiveStatus = async (id, currentStatus) => {
    try {
      await api.patch(`/plans/${id}`, { active: currentStatus === 1 ? 0 : 1 });
      fetchPlans();
    } catch (err) {
      alert('Failed to update package status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this package? If it has members, this will fail. Consider deactivating it instead.')) return;
    
    try {
      await api.delete(`/plans/${id}`);
      setSuccess('Package deleted successfully');
      fetchPlans();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete package');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading packages...</div>;

  return (
    <div className="space-y-6">
      {/* Create/Edit Form */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">
          {isEditing ? 'Edit Subscription Package' : 'Create New Package'}
        </h2>
        
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
        {success && <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg mb-4 text-sm">{success}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="grid grid-2">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Package Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Gold Tier"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Monthly Fee (RWF)</label>
              <input
                type="number"
                required
                min="0"
                value={monthlyFee}
                onChange={(e) => setMonthlyFee(e.target.value)}
                placeholder="e.g. 40000"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Included Services</label>
            {services.length === 0 ? (
              <p style={{ color: 'var(--warning-color)', fontSize: '14px' }}>You need to create Services first before creating packages.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
                {services.filter(s => s.allow_monthly !== 0 && s.allow_monthly !== false).map(service => (
                  <label 
                    key={service.id} 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px',
                      border: `1px solid ${selectedServices.includes(service.name) ? 'var(--primary-color)' : 'var(--border-color)'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: selectedServices.includes(service.name) ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-white)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <input
                      type="checkbox"
                      style={{ marginRight: '10px', width: 'auto' }}
                      checked={selectedServices.includes(service.name)}
                      onChange={() => handleServiceToggle(service.name)}
                    />
                    <span style={{ fontSize: '14px', fontWeight: '500', textTransform: 'capitalize' }}>{service.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '15px', borderTop: '1px solid var(--border-color)' }}>
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="btn-secondary"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={services.length === 0}
              className="btn-primary flex gap-10"
              style={{ opacity: services.length === 0 ? 0.5 : 1 }}
            >
              {isEditing ? <Check size={18} /> : <Plus size={18} />}
              {isEditing ? 'Save Changes' : 'Create Package'}
            </button>
          </div>
        </form>
      </div>

      {/* Packages List */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Current Packages</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="p-4 font-semibold text-gray-600 text-sm">Package Name</th>
                <th className="p-4 font-semibold text-gray-600 text-sm">Monthly Fee</th>
                <th className="p-4 font-semibold text-gray-600 text-sm">Included Services</th>
                <th className="p-4 font-semibold text-gray-600 text-sm">Status</th>
                <th className="p-4 font-semibold text-gray-600 text-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">
                    No packages created yet.
                  </td>
                </tr>
              ) : (
                plans.map((plan) => (
                  <tr key={plan.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 font-medium text-gray-900">{plan.name}</td>
                    <td className="p-4 font-mono text-gray-700">RWF {plan.monthly_fee.toLocaleString()}</td>
                    <td style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        {plan.included_services?.split(',').map(s => (
                          <span key={s} className="badge" style={{ backgroundColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                            {s}
                          </span>
                        ))}
                    </td>
                    <td>
                      <button
                        onClick={() => toggleActiveStatus(plan.id, plan.active)}
                        className={`badge ${plan.active === 1 ? 'badge-success' : 'badge-warning'}`}
                        style={{ border: 'none', cursor: 'pointer', padding: '6px 12px' }}
                        title="Click to toggle status"
                      >
                        {plan.active === 1 ? 'Active' : 'Deactivated'}
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          onClick={() => handleEdit(plan)}
                          className="btn-secondary btn-small"
                          style={{ padding: '6px' }}
                          title="Edit"
                        >
                          <Edit2 size={16} color="var(--primary-color)" />
                        </button>
                        <button
                          onClick={() => handleDelete(plan.id)}
                          className="btn-secondary btn-small"
                          style={{ padding: '6px', borderColor: 'var(--danger-color)' }}
                          title="Delete Permanently"
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
      </div>
    </div>
  );
}
