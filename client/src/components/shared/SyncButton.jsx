import { useSync } from '../../hooks/useSync';

export default function SyncButton() {
  const { trigger, status } = useSync();
  const isRunning = status?.status === 'running' || trigger.isPending;

  const pct =
    status && status.total > 0
      ? Math.round((status.progress / status.total) * 100)
      : 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button
        onClick={() => trigger.mutate()}
        disabled={isRunning}
        style={{
          padding: '8px 18px',
          background: isRunning ? '#ccc' : '#ff7a59',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: isRunning ? 'not-allowed' : 'pointer',
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        {isRunning ? 'Syncing...' : 'Sync Now'}
      </button>

      {isRunning && (
        <div style={{ flex: 1, maxWidth: 200 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{status?.phase || 'Starting...'}</div>
          <div style={{ background: '#e0e0e0', borderRadius: 4, height: 6, overflow: 'hidden' }}>
            <div
              style={{ width: `${pct}%`, background: '#ff7a59', height: '100%', transition: 'width 0.3s' }}
            />
          </div>
        </div>
      )}

      {status?.status === 'completed' && (
        <span style={{ fontSize: 13, color: '#2e7d32', fontWeight: 500 }}>
          Sync complete — {status.total} deals
        </span>
      )}
      {status?.status === 'failed' && (
        <span style={{ fontSize: 13, color: '#c62828' }}>Sync failed: {status.error}</span>
      )}
    </div>
  );
}
