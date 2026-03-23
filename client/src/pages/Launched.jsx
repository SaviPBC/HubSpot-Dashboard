import { useState } from 'react';
import { useDashboard } from '../hooks/useDashboard';
import LaunchedTable from '../components/dashboard/LaunchedTable';
import TimeframeSelector from '../components/shared/TimeframeSelector';

function defaultDates() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return [from.toISOString().slice(0, 10), to.toISOString().slice(0, 10)];
}

export default function Launched() {
  const [defaultFrom, defaultTo] = defaultDates();
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  const { data, isLoading, isError, error } = useDashboard(from, to);
  const snapshotMode = data?.source === 'snapshot';

  return (
    <div>
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
        <LaunchedTable
          deals={data.launched}
          snapshotMode={snapshotMode}
          launchedByMonth={data.launchedByMonth}
          launchedBySize={data.launchedBySize}
          portalId={data.portalId}
        />
      )}
    </div>
  );
}
