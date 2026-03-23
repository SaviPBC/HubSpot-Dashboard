import { useState } from 'react';
import { useDashboard } from '../hooks/useDashboard';
import SummaryCards from '../components/dashboard/SummaryCards';
import TimeframeSelector from '../components/shared/TimeframeSelector';
import SyncButton from '../components/shared/SyncButton';

function defaultDates() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return [from.toISOString().slice(0, 10), to.toISOString().slice(0, 10)];
}

function isOutsideDataRange(from, to, dataRange) {
  if (!dataRange || !dataRange.earliest || !dataRange.latest) return false;
  const earliest = dataRange.earliest.slice(0, 10);
  const latest = dataRange.latest.slice(0, 10);
  return from < earliest || to > latest;
}

function formatTimestamp(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export default function Dashboard() {
  const [defaultFrom, defaultTo] = defaultDates();
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  const { data, isLoading, isError, error } = useDashboard(from, to);
  const snapshotMode = data?.source === 'snapshot';
  const outsideRange = data && isOutsideDataRange(from, to, data.dataRange);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>Overview</h1>
        <SyncButton />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <span style={{ fontSize: 13, color: '#666', fontWeight: 500 }}>Timeframe:</span>
        <TimeframeSelector from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
      </div>

      {isLoading && <p style={{ color: '#888' }}>Loading...</p>}
      {isError && (
        <p style={{ color: '#c62828' }}>
          Error: {error?.response?.data?.error || error?.message}
        </p>
      )}

      {data && (
        <>
          {snapshotMode && (
            <div style={{
              background: '#fff8e1',
              border: '1px solid #ffe082',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 20,
              fontSize: 13,
              color: '#6d4c00',
            }}>
              Showing metrics from last sync ({formatTimestamp(data.snapshotTimestamp)}). Sync HubSpot to see full deal details.
            </div>
          )}
          {outsideRange && (
            <div style={{
              background: '#fce4ec',
              border: '1px solid #ef9a9a',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 20,
              fontSize: 13,
              color: '#b71c1c',
            }}>
              Selected timeframe extends beyond synced data (synced: {data.dataRange.earliest?.slice(0, 10)} to {data.dataRange.latest?.slice(0, 10)}). Results may be incomplete — sync to fetch more data.
            </div>
          )}
          <SummaryCards summary={data.summary} />
        </>
      )}
    </div>
  );
}
