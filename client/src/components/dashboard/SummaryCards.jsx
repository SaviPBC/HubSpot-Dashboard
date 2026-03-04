const cardStyle = {
  background: '#fff',
  borderRadius: 10,
  padding: '20px 24px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  flex: 1,
  minWidth: 160,
};

function Card({ label, value, color }) {
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 13, color: '#888', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color: color || '#1a1a2e' }}>{value ?? '—'}</div>
    </div>
  );
}

export default function SummaryCards({ summary }) {
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
      <Card label="Total Deals in DB" value={summary?.total} />
      <Card label="Currently Implementing" value={summary?.implementing} color="#1565c0" />
      <Card label="Launched in Period" value={summary?.launchedInPeriod} color="#2e7d32" />
    </div>
  );
}
