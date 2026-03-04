import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => client.get('/settings').then((r) => r.data),
  });
}

export function useSaveSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => client.put('/settings', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });
}

export function useTestConnection() {
  return useMutation({
    mutationFn: (token) => client.post('/settings/test', { token }).then((r) => r.data),
  });
}

export function useProperties() {
  return useQuery({
    queryKey: ['hubspot-properties'],
    queryFn: () => client.get('/hubspot/properties/all').then((r) => r.data),
    enabled: false,
  });
}

export function usePipelines() {
  return useQuery({
    queryKey: ['hubspot-pipelines'],
    queryFn: () => client.get('/hubspot/pipelines').then((r) => r.data),
    enabled: false,
  });
}
