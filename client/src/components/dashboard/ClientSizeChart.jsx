import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function ClientSizeChart({ sizeDistribution, implementingSizeDistribution }) {
  if (!sizeDistribution || sizeDistribution.length === 0) {
    return (
      <div style={cardStyle}>
        <h3 style={titleStyle}>Client Size Distribution</h3>
        <p style={{ color: '#888', fontSize: 14 }}>No data — run a sync first.</p>
      </div>
    );
  }

  // Merge total and implementing distributions by size bucket
  const implementingMap = {};
  for (const row of implementingSizeDistribution || []) {
    implementingMap[row.size] = row.count;
  }

  const data = sizeDistribution.map((row) => ({
    size: row.size || 'Unknown',
    Total: row.count,
    Implementing: implementingMap[row.size] || 0,
  }));

  return (
    <div style={cardStyle}>
      <h3 style={titleStyle}>Client Size Distribution</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="size" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="Total" fill="#b0bec5" radius={[3, 3, 0, 0]} />
          <Bar dataKey="Implementing" fill="#1565c0" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const cardStyle = {
  background: '#fff',
  borderRadius: 10,
  padding: '20px 24px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  marginBottom: 24,
};

const titleStyle = {
  fontSize: 15,
  fontWeight: 600,
  marginBottom: 16,
  color: '#1a1a2e',
};
