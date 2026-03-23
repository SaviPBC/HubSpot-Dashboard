import { useState } from 'react';
import { useRenewals } from '../hooks/useRenewals';
import RenewalsTable from '../components/dashboard/RenewalsTable';

function defaultRenewalDates() {
  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + 90);
  return [from.toISOString().slice(0, 10), to.toISOString().slice(0, 10)];
}

export default function Renewals() {
  const [defaultFrom, defaultTo] = defaultRenewalDates();
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  const { data, isLoading } = useRenewals(from, to);

  return (
    <div>
      <RenewalsTable
        deals={data?.deals || []}
        loading={isLoading}
        from={from}
        to={to}
        onFromChange={setFrom}
        onToChange={setTo}
        snapshotMode={data?.source === 'snapshot'}
        stageMap={data?.stageMap}
        portalId={data?.portalId}
      />
    </div>
  );
}
