import { useQuery } from '@tanstack/react-query';

const API_BASE = 'http://localhost:3001/api';

const getHeaders = () => {
  const token = localStorage.getItem('rawprocess_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export const useDashboard = () => {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/dashboard`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch dashboard data');
      return res.json();
    },
    enabled: !!localStorage.getItem('rawprocess_token'),
  });
};
