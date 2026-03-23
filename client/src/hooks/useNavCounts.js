import { useQuery } from '@tanstack/react-query';
import client from '../api/client';

export function useNavCounts() {
  const now = new Date();
  const year = now.getFullYear();
  const renewalFrom = `${year}-01-01`;
  const renewalTo = `${year}-12-31`;

  const dashboard = useQuery({
    queryKey: ['navCounts', 'dashboard'],
    queryFn: () => client.get('/dashboard').then((r) => r.data),
    staleTime: 60_000,
  });

  const renewals = useQuery({
    queryKey: ['navCounts', 'renewals', year],
    queryFn: () =>
      client.get('/renewals', { params: { from: renewalFrom, to: renewalTo } }).then((r) => {
        if (Array.isArray(r.data)) return { deals: r.data };
        return r.data;
      }),
    staleTime: 60_000,
  });

  const d = dashboard.data;
  return {
    aboutToImplement: d?.aboutToImplement?.length ?? null,
    implementing: d?.implementing?.length ?? null,
    launched: d?.launched?.length ?? null,
    renewals: renewals.data?.deals?.length ?? null,
  };
}
