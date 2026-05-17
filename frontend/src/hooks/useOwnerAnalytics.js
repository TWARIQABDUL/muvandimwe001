import { useState, useEffect } from 'react';
import { api } from '../store/authStore.js';

export function useOwnerAnalytics(timeframe = 'today') {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let canceled = false;

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        const [dashboardResponse, trendResponse, activeResponse] = await Promise.all([
          api.get(`/dashboard/${timeframe}`),
          api.get('/trends/7day'),
          api.get('/members/active')
        ]);

        if (canceled) {
          return;
        }

        setData({
          dashboard: dashboardResponse.data,
          trend: trendResponse.data,
          activeMembers: activeResponse.data
        });
      } catch (err) {
        if (canceled) {
          return;
        }

        setError(err.response?.data?.error || 'Failed to fetch owner analytics');
      } finally {
        if (!canceled) {
          setLoading(false);
        }
      }
    };

    fetchAnalytics();
    return () => {
      canceled = true;
    };
  }, [timeframe]);

  return { data, loading, error };
}
