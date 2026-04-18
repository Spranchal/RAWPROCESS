import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = 'http://localhost:3001/api';

const getHeaders = () => {
  const token = localStorage.getItem('rawprocess_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export const useNotifications = () => {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/notifications`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch notifications');
      return res.json();
    },
    enabled: !!localStorage.getItem('rawprocess_token'),
  });
};

export const useMarkNotificationsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/notifications/read`, {
        method: 'PUT',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to mark notifications as read');
      return res.json();
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const previousNotifications = queryClient.getQueryData(['notifications']);

      queryClient.setQueryData(['notifications'], (old) => {
        if (!old) return old;
        return {
          ...old,
          notifications: (old.notifications || []).map(n => ({ ...n, is_read: 1 }))
        };
      });

      return { previousNotifications };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['notifications'], context.previousNotifications);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};
