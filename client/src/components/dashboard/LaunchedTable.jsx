import { useState } from 'react';

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtMonth(monthStr) {
  if (!monthStr) return '—';
  const [y, m] = monthStr.split('-');
  const d = new Date(Number(y), Number(m) - 1);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

export default function LaunchedTable({ deals, snapshotMode, launchedByMonth, launchedBySize }) {
  const [sortCol, setSortCol] = useState('launched_at');
  const [sortDir, setSortDir] = useState('desc');

  function sort(col) {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('asc'); }
  }

  const sorted = [...(deals || [])].sort((a, b) => {
    const va = (a[sortCol] || '').toLowerCase();
    const vb = (b[sortCol] || '').toLowerCase();
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  function arrow(col) {
    if (sortCol !== col) return ' ↕';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  }

  const totalLaunched = snapshotMode
    ? (launchedByMonth || []).reduce((sum, r) => sum + r.count, 0)
    : (deals || []).length;

  // Snapshot mode: show aggregate metrics instead of deal rows
  if (snapshotMode) {
    const hasData = (launchedByMonth && launchedByMonth.length > 0) || (launchedBySize && launchedBySize.length > 0);
    return (
      <div style={cardStyle}>
        <h3 style={titleStyle}>Launched in Period ({totalLaunched})</h3>
        {!hasData ? (
          <p style={{ color: '#888', fontSize: 14 }}>No launched deals in snapshot data for this period.</p>
        ) : (
          <>
            <p style={{ color: '#999', fontSize: 12, marginBottom: 16 }}>
              Showing aggregate metrics from snapshot. Sync HubSpot for individual deal details.
            </p>
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              {launchedByMonth && launchedByMonth.length > 0 && (
                <div style={{ flex: 1, minWidth: 200 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 8 }}>By Month</h4>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Month</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {launchedByMonth.map((row, i) => (
                        <tr key={row.month} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                          <td style={tdStyle}>{fmtMonth(row.month)}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>{row.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {launchedBySize && launchedBySize.length > 0 && (
                <div style={{ flex: 1, minWidth: 200 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 8 }}>By Size</h4>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Size</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {launchedBySize.map((row, i) => (
                        <tr key={row.size} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                          <td style={tdStyle}>{row.size}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>{row.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // Live DB mode: show full deal rows
  return (
    <div style={cardStyle}>
      <h3 style={titleStyle}>Launched in Period ({totalLaunched})</h3>
      {!deals || deals.length === 0 ? (
        <p style={{ color: '#888', fontSize: 14 }}>No deals launched in this period.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {[['name', 'Name'], ['size_value', 'Size'], ['network_value', 'Network (Employers)'], ['launched_at', 'Launch Date']].map(
                  ([col, label]) => (
                    <th key={col} style={thStyle} onClick={() => sort(col)}>
                      {label}{arrow(col)}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {sorted.map((deal, i) => (
                <tr key={deal.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={tdStyle}>{deal.name}</td>
                  <td style={tdStyle}>{deal.size_value || '—'}</td>
                  <td style={tdStyle}>{deal.network_value || '—'}</td>
                  <td style={tdStyle}>{fmtDate(deal.launched_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
const titleStyle = { fontSize: 15, fontWeight: 600, marginBottom: 16, color: '#1a1a2e' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const thStyle = {
  textAlign: 'left',
  padding: '8px 12px',
  borderBottom: '2px solid #eee',
  color: '#555',
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  userSelect: 'none',
};
const tdStyle = { padding: '8px 12px', borderBottom: '1px solid #f0f0f0', color: '#333' };
