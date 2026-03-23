import { useDashboard } from '../hooks/useDashboard';
import ImplementingTable from '../components/dashboard/ImplementingTable';

function defaultDates() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return [from.toISOString().slice(0, 10), to.toISOString().slice(0, 10)];
}

export default function Implementing() {
  const [from, to] = defaultDates();
  const { data, isLoading, isError, error } = useDashboard(from, to);
  const snapshotMode = data?.source === 'snapshot';

  return (
    <div>
      {isLoading && <p style={{ color: '#888' }}>Loading...</p>}
      {isError && (
        <p style={{ color: '#c62828' }}>
          Error: {error?.response?.data?.error || error?.message}
        </p>
      )}
      {data && (
        <ImplementingTable
          deals={data.implementing}
          snapshotMode={snapshotMode}
          stageMap={data.stageMap}
          portalId={data.portalId}
        />
      )}
    </div>
  );
}
