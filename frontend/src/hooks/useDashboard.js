import { useState, useEffect } from 'react';
import { api } from '../store/authStore.js';

export function useDashboard(timeframe = 'today') {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/dashboard/${timeframe}`);
        setData(response.data);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [timeframe]);

  return { data, loading, error };
}
