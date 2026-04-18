import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = 'http://localhost:3001/api';

const getHeaders = () => {
  const token = localStorage.getItem('rawprocess_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export const useProjects = () => {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/feed/paginated?limit=1`, { headers: getHeaders() }); // Just to get the projects list which is returned with the feed
      if (!res.ok) throw new Error('Failed to fetch projects');
      const data = await res.json();
      return data.projects || [];
    },
    enabled: !!localStorage.getItem('rawprocess_token'),
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, isPublic }) => {
      const res = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ name, isPublic }),
      });
      if (!res.ok) throw new Error('Failed to create project');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};
