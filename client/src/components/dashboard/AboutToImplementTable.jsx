import { useState } from 'react';
import * as XLSX from 'xlsx';

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function daysSince(iso) {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function exportToExcel(deals, stageMap) {
  const rows = deals.map((deal) => ({
    Name: deal.name || '',
    Size: deal.size_value || '',
    'Network (Employers)': deal.network_value || '',
    Stage: (stageMap && stageMap[deal.stage_id]) || deal.stage_id || '',
    'Pricing Model': deal.pricing_model || '',
    'Deal Source': deal.deal_source || '',
    'Launch Date': fmtDate(deal.launched_at),
    'Created Date': fmtDate(deal.created_at),
    'Days in Stage': daysSince(deal.created_at) ?? '',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'About to Implement');
  XLSX.writeFile(wb, 'clients-about-to-implement.xlsx');
}

function getCellValue(deal, col, stageMap) {
  if (col === 'days') return String(daysSince(deal.created_at) ?? '');
  if (col === 'launched_at') return fmtDate(deal.launched_at);
  if (col === 'created_at') return fmtDate(deal.created_at);
  if (col === 'stage_id') return (stageMap && stageMap[deal.stage_id]) || deal.stage_id || '';
  return String(deal[col] || '');
}

export default function AboutToImplementTable({ deals, snapshotMode, stageMap, portalId }) {
  const [sortCol, setSortCol] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [filters, setFilters] = useState({});

  function sort(col) {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('asc'); }
  }

  function setFilter(col, val) {
    setFilters((f) => ({ ...f, [col]: val }));
  }

  const columns = [
    ...(!snapshotMode ? [['name', 'Name']] : []),
    ['size_value', 'Size'],
    ...(!snapshotMode ? [['network_value', 'Network (Employers)']] : []),
    ['stage_id', 'Stage'],
    ['pricing_model', 'Pricing Model'],
    ['deal_source', 'Deal Source'],
    ['launched_at', 'Launch Date'],
    ['created_at', 'Created'],
    ['days', 'Days in Stage'],
  ];

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

  const filtered = sorted.filter((deal) =>
    columns.every(([col]) => {
      const f = (filters[col] || '').toLowerCase();
      if (!f) return true;
      return getCellValue(deal, col, stageMap).toLowerCase().includes(f);
    })
  );

  function arrow(col) {
    if (sortCol !== col) return ' ↕';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  }

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={titleStyle}>
          Clients About to Implement ({filtered.length}{hasFilters ? ` of ${(deals || []).length}` : ''})
        </h3>
        {(deals || []).length > 0 && (
          <button onClick={() => exportToExcel(filtered, stageMap)} style={exportBtnStyle}>
            Export to Excel
          </button>
        )}
      </div>
      {!deals || deals.length === 0 ? (
        <p style={{ color: '#888', fontSize: 14 }}>
          {snapshotMode
            ? 'No about-to-implement deals in snapshot data.'
            : 'No deals in survey sent / survey completed stages.'}
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
                  {columns.map(([col, label]) => (
                    <th key={col} style={thStyle} onClick={() => sort(col)}>
                      {label}{arrow(col)}
                    </th>
                  ))}
                </tr>
                <tr>
                  {columns.map(([col]) => (
                    <th key={col} style={filterThStyle}>
                      <input
                        style={filterInputStyle}
                        placeholder="Filter…"
                        value={filters[col] || ''}
                        onChange={(e) => setFilter(col, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((deal, i) => (
                  <tr key={deal.id || i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    {!snapshotMode && (
                      <td style={tdStyle}>
                        {portalId ? (
                          <a href={`https://app.hubspot.com/contacts/${portalId}/deal/${deal.id}`} target="_blank" rel="noreferrer" style={linkStyle}>{deal.name}</a>
                        ) : deal.name}
                      </td>
                    )}
                    <td style={tdStyle}>{deal.size_value || '—'}</td>
                    {!snapshotMode && <td style={tdStyle}>{deal.network_value || '—'}</td>}
                    <td style={tdStyle}>{(stageMap && stageMap[deal.stage_id]) || deal.stage_id || '—'}</td>
                    <td style={tdStyle}>{deal.pricing_model || '—'}</td>
                    <td style={tdStyle}>{deal.deal_source || '—'}</td>
                    <td style={tdStyle}>{fmtDate(deal.launched_at)}</td>
                    <td style={tdStyle}>{fmtDate(deal.created_at)}</td>
                    <td style={tdStyle}>{daysSince(deal.created_at) ?? '—'}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={columns.length} style={{ ...tdStyle, color: '#aaa', textAlign: 'center', padding: '16px 12px' }}>
                      No results match the current filters.
                    </td>
                  </tr>
                )}
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
  borderBottom: '1px solid #eee',
  color: '#555',
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  userSelect: 'none',
};
const filterThStyle = {
  padding: '4px 8px',
  borderBottom: '2px solid #eee',
  background: '#fafafa',
};
const filterInputStyle = {
  width: '100%',
  padding: '3px 6px',
  fontSize: 11,
  border: '1px solid #ddd',
  borderRadius: 4,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};
const tdStyle = { padding: '8px 12px', borderBottom: '1px solid #f0f0f0', color: '#333' };
const linkStyle = { color: '#1a56db', textDecoration: 'none', fontWeight: 500 };
