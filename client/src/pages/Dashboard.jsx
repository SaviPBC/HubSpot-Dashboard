import { useState } from 'react';
import { useDashboard } from '../hooks/useDashboard';
import { useRenewals } from '../hooks/useRenewals';
import SummaryCards from '../components/dashboard/SummaryCards';
import ClientSizeChart from '../components/dashboard/ClientSizeChart';
import ImplementingTable from '../components/dashboard/ImplementingTable';
import LaunchedTable from '../components/dashboard/LaunchedTable';
import RenewalsTable from '../components/dashboard/RenewalsTable';
import TimeframeSelector from '../components/shared/TimeframeSelector';
import SyncButton from '../components/shared/SyncButton';

function defaultDates() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return [from.toISOString().slice(0, 10), to.toISOString().slice(0, 10)];
}

function defaultRenewalDates() {
  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + 90);
  return [from.toISOString().slice(0, 10), to.toISOString().slice(0, 10)];
}

export default function Dashboard() {
  const [defaultFrom, defaultTo] = defaultDates();
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  const [defaultRenewalFrom, defaultRenewalTo] = defaultRenewalDates();
  const [renewalsFrom, setRenewalsFrom] = useState(defaultRenewalFrom);
  const [renewalsTo, setRenewalsTo] = useState(defaultRenewalTo);

  const { data, isLoading, isError, error } = useDashboard(from, to);
  const { data: renewalsData, isLoading: renewalsLoading } = useRenewals(renewalsFrom, renewalsTo);

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
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>Dashboard</h1>
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
          <SummaryCards summary={data.summary} />
          <ClientSizeChart
            sizeDistribution={data.sizeDistribution}
            implementingSizeDistribution={data.implementingSizeDistribution}
          />
          <ImplementingTable deals={data.implementing} />
          <LaunchedTable deals={data.launched} />
        </>
      )}

      <RenewalsTable
        deals={renewalsData || []}
        loading={renewalsLoading}
        from={renewalsFrom}
        to={renewalsTo}
        onFromChange={setRenewalsFrom}
        onToChange={setRenewalsTo}
      />
    </div>
  );
}
