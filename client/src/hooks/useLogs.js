import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = 'http://localhost:3001/api';

const getHeaders = () => {
  const token = localStorage.getItem('rawprocess_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export const useLogs = (options = {}) => {
  const { limit = 10, offset = 0, author, project } = options;

  let url = `${API_BASE}/feed/paginated?limit=${limit}&offset=${offset}`;
  if (author) url += `&author=${author}`;
  if (project) url += `&project=${project}`;

  return useQuery({
    queryKey: ['logs', { limit, offset, author, project }],
    queryFn: async () => {
      const res = await fetch(url, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch logs');
      return res.json();
    },
  });
};

export const useLikeLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (logId) => {
      const res = await fetch(`${API_BASE}/feed/${logId}/like`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to like log');
      return res.json();
    },
    // Optimistic Update
    onMutate: async (logId) => {
      await queryClient.cancelQueries({ queryKey: ['logs'] });
      const previousLogs = queryClient.getQueryData(['logs']);
      const currentUser = localStorage.getItem('rawprocess_user');

      queryClient.setQueriesData({ queryKey: ['logs'] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          logs: old.logs.map((log) => {
            if (log.id === logId) {
              const likes = log.likes || [];
              const alreadyLiked = likes.includes(currentUser);
              return {
                ...log,
                likes: alreadyLiked
                  ? likes.filter((u) => u !== currentUser)
                  : [...likes, currentUser],
              };
            }
            return log;
          }),
        };
      });

      return { previousLogs };
    },
    onError: (err, logId, context) => {
      queryClient.setQueriesData({ queryKey: ['logs'] }, context.previousLogs);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    },
  });
};

export const useCommentOnLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ logId, content, type = 'comment' }) => {
      const res = await fetch(`${API_BASE}/feed/${logId}/comment`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ content, type }),
      });
      if (!res.ok) throw new Error('Failed to comment');
      return res.json();
    },
    onMutate: async ({ logId, content, type = 'comment' }) => {
      await queryClient.cancelQueries({ queryKey: ['logs'] });
      const previousLogs = queryClient.getQueryData(['logs']);
      const currentUser = localStorage.getItem('rawprocess_user');

      queryClient.setQueriesData({ queryKey: ['logs'] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          logs: old.logs.map((log) => {
            if (log.id === logId) {
              const newComment = {
                id: Date.now(), // Temporary ID
                username: currentUser,
                content,
                type,
                timestamp: new Date().toISOString(),
              };
              return {
                ...log,
                comments: [...(log.comments || []), newComment],
              };
            }
            return log;
          }),
        };
      });

      return { previousLogs };
    },
    onError: (err, variables, context) => {
      queryClient.setQueriesData({ queryKey: ['logs'] }, context.previousLogs);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    },
  });
};

export const useAcknowledgeLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (logId) => {
      const res = await fetch(`${API_BASE}/feed/${logId}/acknowledge`, {
        method: 'PUT',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to acknowledge log');
      return res.json();
    },
    onMutate: async (logId) => {
      await queryClient.cancelQueries({ queryKey: ['logs'] });
      const previousLogs = queryClient.getQueryData(['logs']);

      queryClient.setQueriesData({ queryKey: ['logs'] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          logs: old.logs.map((log) => {
            if (log.id === logId) {
              return { ...log, status: 'success' };
            }
            return log;
          }),
        };
      });

      return { previousLogs };
    },
    onError: (err, logId, context) => {
      queryClient.setQueriesData({ queryKey: ['logs'] }, context.previousLogs);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    },
  });
};
