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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Package Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                placeholder="e.g. Gold Tier"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Fee (RWF)</label>
              <input
                type="number"
                required
                min="0"
                value={monthlyFee}
                onChange={(e) => setMonthlyFee(e.target.value)}
                className="input-field"
                placeholder="e.g. 40000"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Included Services</label>
            {services.length === 0 ? (
              <p className="text-sm text-amber-600">You need to create Services first before creating packages.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {services.map(service => (
                  <label 
                    key={service.id} 
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedServices.includes(service.name) 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mr-3 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      checked={selectedServices.includes(service.name)}
                      onChange={() => handleServiceToggle(service.name)}
                    />
                    <span className="text-sm font-medium capitalize text-gray-800">{service.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={services.length === 0}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
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
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {plan.included_services?.split(',').map(s => (
                          <span key={s} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs capitalize">
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleActiveStatus(plan.id, plan.active)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          plan.active === 1 
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        title="Click to toggle status"
                      >
                        {plan.active === 1 ? 'Active' : 'Deactivated'}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(plan)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(plan.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Permanently"
                        >
                          <Trash2 size={16} />
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
