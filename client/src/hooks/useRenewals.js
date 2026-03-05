import { useQuery } from '@tanstack/react-query';
import client from '../api/client';

export function useRenewals(from, to) {
  return useQuery({
    queryKey: ['renewals', from, to],
    queryFn: () => client.get('/renewals', { params: { from, to } }).then((r) => {
      // Handle both old (array) and new (object with source) response shapes
      if (Array.isArray(r.data)) return { deals: r.data, source: 'db' };
      return r.data;
    }),
    enabled: !!from && !!to,
  });
}
