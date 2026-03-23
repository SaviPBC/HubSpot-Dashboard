import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';

export function useSync() {
  const qc = useQueryClient();
  const [status, setStatus] = useState(null);
  const pollRef = useRef(null);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function startPolling() {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await client.get('/sync/status');
        setStatus(data);
        if (data.status === 'completed' || data.status === 'failed') {
          stopPolling();
          qc.invalidateQueries({ queryKey: ['dashboard'] });
        }
      } catch (_) {}
    }, 1000);
  }

  useEffect(() => () => stopPolling(), []);

  const trigger = useMutation({
    mutationFn: ({ full = false } = {}) => client.post(`/sync${full ? '?full=true' : ''}`).then((r) => r.data),
    onSuccess: () => startPolling(),
    onError: (err) => setStatus({ status: 'failed', error: err.response?.data?.error || err.message }),
  });

  return { trigger, status };
}
