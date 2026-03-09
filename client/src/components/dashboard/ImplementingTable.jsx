import { useState } from 'react';
import * as XLSX from 'xlsx';

function exportToExcel(deals, snapshotMode) {
  const rows = deals.map((deal) => {
    const base = {
      Size: deal.size_value || '',
      'Launch Date': deal.launched_at ? new Date(deal.launched_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '',
      'Stage ID': deal.stage_id || '',
      'Days Active': deal.created_at ? Math.floor((Date.now() - new Date(deal.created_at).getTime()) / (1000 * 60 * 60 * 24)) : '',
    };
    if (!snapshotMode) {
      return { Name: deal.name || '', 'Network (Employers)': deal.network_value || '', ...base };
    }
    return base;
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Currently Implementing');
  XLSX.writeFile(wb, 'currently-implementing.xlsx');
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function daysSince(iso) {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export default function ImplementingTable({ deals, snapshotMode }) {
  const [sortCol, setSortCol] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  function sort(col) {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('asc'); }
  }

  const sorted = [...(deals || [])].sort((a, b) => {
    let va, vb;
    if (sortCol === 'days') {
      va = daysSince(a.created_at) ?? 0;
      vb = daysSince(b.created_at) ?? 0;
    } else {
      va = (a[sortCol] || '').toLowerCase();
      vb = (b[sortCol] || '').toLowerCase();
    }
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  function arrow(col) {
    if (sortCol !== col) return ' ↕';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  }

  // Snapshot mode: show anonymized columns (no name, no network)
  const columns = snapshotMode
    ? [['size_value', 'Size'], ['launched_at', 'Launch Date'], ['stage_id', 'Stage ID'], ['days', 'Days Active']]
    : [['name', 'Name'], ['size_value', 'Size'], ['network_value', 'Network (Employers)'], ['launched_at', 'Launch Date'], ['stage_id', 'Stage ID'], ['days', 'Days Active']];

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ ...titleStyle, marginBottom: 0 }}>Currently Implementing ({(deals || []).length})</h3>
        {(deals || []).length > 0 && (
          <button onClick={() => exportToExcel(sorted, snapshotMode)} style={exportBtnStyle}>
            Export to Excel
          </button>
        )}
      </div>
      {!deals || deals.length === 0 ? (
        <p style={{ color: '#888', fontSize: 14 }}>
          {snapshotMode ? 'No implementing deals in snapshot data.' : 'No deals in implementing stages.'}
        </p>
      ) : (
        <>
          {snapshotMode && (
            <p style={{ color: '#999', fontSize: 12, marginBottom: 12 }}>
              Showing anonymized snapshot data. Sync HubSpot for full details.
            </p>
          )}
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  {columns.map(
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
                  <tr key={deal.id || i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    {!snapshotMode && <td style={tdStyle}>{deal.name}</td>}
                    <td style={tdStyle}>{deal.size_value || '—'}</td>
                    {!snapshotMode && <td style={tdStyle}>{deal.network_value || '—'}</td>}
                    <td style={tdStyle}>{fmtDate(deal.launched_at)}</td>
                    <td style={tdStyle}>{deal.stage_id || '—'}</td>
                    <td style={tdStyle}>{daysSince(deal.created_at) ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
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
const titleStyle = { fontSize: 15, fontWeight: 600, color: '#1a1a2e' };
const exportBtnStyle = {
  marginLeft: 'auto',
  padding: '5px 12px',
  fontSize: 12,
  fontWeight: 600,
  color: '#fff',
  background: '#217346',
  border: 'none',
  borderRadius: 5,
  cursor: 'pointer',
};
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
