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
        fetch(`${API_BASE}/users/${username}`, { headers: getHeaders() }),
        fetch(`${API_BASE}/users/${username}/contributions`, { headers: getHeaders() }),
        fetch(`${API_BASE}/feed/paginated?author=${username}`, { headers: getHeaders() })
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
      const res = await fetch(`${API_BASE}/users/${username}/follow`, {
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
