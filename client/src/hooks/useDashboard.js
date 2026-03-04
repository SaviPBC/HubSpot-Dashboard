import { useQuery } from '@tanstack/react-query';
import client from '../api/client';

export function useDashboard(from, to) {
  return useQuery({
    queryKey: ['dashboard', from, to],
    queryFn: () =>
      client.get('/dashboard', { params: { from, to } }).then((r) => r.data),
  });
}
