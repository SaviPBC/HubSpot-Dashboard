import { useQuery } from '@tanstack/react-query';
import client from '../api/client';

export function useRenewals(from, to) {
  return useQuery({
    queryKey: ['renewals', from, to],
    queryFn: () => client.get('/renewals', { params: { from, to } }).then((r) => r.data),
    enabled: !!from && !!to,
  });
}
