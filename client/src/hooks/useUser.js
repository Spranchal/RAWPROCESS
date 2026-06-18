import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = 'http://localhost:3001/api';

const getHeaders = () => {
  const token = localStorage.getItem('rawprocess_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export const useProfile = (username) => {
  return useQuery({
    queryKey: ['profile', username],
    queryFn: async () => {
      const [profileRes, contribRes, logsRes] = await Promise.all([
        fetch(`${API_BASE}/users/${encodeURIComponent(username)}`, { headers: getHeaders() }),
        fetch(`${API_BASE}/users/${encodeURIComponent(username)}/contributions`, { headers: getHeaders() }),
        fetch(`${API_BASE}/feed/paginated?author=${encodeURIComponent(username)}`, { headers: getHeaders() })
      ]);

      if (!profileRes.ok || !contribRes.ok || !logsRes.ok) {
        throw new Error('Failed to fetch profile data');
      }

      const profile = await profileRes.json();
      const contributionsData = await contribRes.json();
      const logsData = await logsRes.json();

      return {
        ...profile,
        contributions: contributionsData.contributions || [],
        logs: logsData.logs || []
      };
    },
    enabled: !!username && !!localStorage.getItem('rawprocess_token'),
  });
};

export const useFollowUser = (username) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ isFollowing }) => {
      const method = isFollowing ? 'DELETE' : 'POST';
      const res = await fetch(`${API_BASE}/users/${encodeURIComponent(username)}/follow`, {
        method,
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to update follow status');
      return res.json();
    },
    onMutate: async ({ isFollowing }) => {
      await queryClient.cancelQueries({ queryKey: ['profile', username] });
      const previousProfile = queryClient.getQueryData(['profile', username]);

      queryClient.setQueryData(['profile', username], (old) => {
        if (!old) return old;
        return {
          ...old,
          isFollowing: !isFollowing,
          stats: {
            ...old.stats,
            followers: isFollowing ? old.stats.followers - 1 : old.stats.followers + 1
          }
        };
      });

      return { previousProfile };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['profile', username], context.previousProfile);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', username] });
    },
  });
};
export const useUserSearch = (query) => {
  return useQuery({
    queryKey: ['userSearch', query],
    queryFn: async () => {
      if (!query || query.trim() === '') return { users: [] };
      const res = await fetch(`${API_BASE}/users/search?q=${encodeURIComponent(query)}`, { 
        headers: getHeaders() 
      });
      if (!res.ok) throw new Error('Search failed');
      return res.json();
    },
    enabled: !!query && query.length >= 2,
    staleTime: 30000,
  });
};

export const useUpdateProfile = (username) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData) => {
      const res = await fetch(`${API_BASE}/users/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('rawprocess_token')}`
        },
        body: formData
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update profile');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', username] });
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    }
  });
};

export const usePinProject = (username) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name) => {
      const res = await fetch(`${API_BASE}/users/pins/project`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ name })
      });
      if (!res.ok) throw new Error('Failed to pin project');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', username] });
    }
  });
};

export const useUnpinProject = (username) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name) => {
      const res = await fetch(`${API_BASE}/users/pins/project`, {
        method: 'DELETE',
        headers: getHeaders(),
        body: JSON.stringify({ name })
      });
      if (!res.ok) throw new Error('Failed to unpin project');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', username] });
    }
  });
};

export const usePinLog = (username) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`${API_BASE}/users/pins/log`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ id })
      });
      if (!res.ok) throw new Error('Failed to pin log');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', username] });
    }
  });
};

export const useUnpinLog = (username) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`${API_BASE}/users/pins/log`, {
        method: 'DELETE',
        headers: getHeaders(),
        body: JSON.stringify({ id })
      });
      if (!res.ok) throw new Error('Failed to unpin log');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', username] });
    }
  });
};

