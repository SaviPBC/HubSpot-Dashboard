import { useState } from 'react';
import * as XLSX from 'xlsx';

function exportToExcel(deals, snapshotMode, stageMap) {
  const rows = deals.map((deal) => {
    const base = {
      'Contract Start': fmt(deal.contract_start_date),
      'Contract End': fmt(deal.contract_end_date),
      'Days Until Expiry': daysUntil(deal.contract_end_date) !== null ? daysUntil(deal.contract_end_date) : '',
      'Renewal Date': fmt(deal.contract_renewal_date),
      Stage: (stageMap && stageMap[deal.stage_id]) || deal.stage_id || '',
      'Pricing Model': deal.pricing_model || '',
      'Deal Source': deal.deal_source || '',
    };
    if (!snapshotMode) return { Name: deal.name || '', ...base };
    return base;
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Contracts for Renewal');
  XLSX.writeFile(wb, 'contracts-for-renewal.xlsx');
}

function fmt(d) {
  if (!d) return '';
  const parsed = isNaN(Number(d)) ? new Date(d) : new Date(Number(d));
  return isNaN(parsed.getTime()) ? d : parsed.toLocaleDateString();
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = isNaN(Number(dateStr)) ? new Date(dateStr) : new Date(Number(dateStr));
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString();
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = isNaN(Number(dateStr)) ? new Date(dateStr) : new Date(Number(dateStr));
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - today.getTime()) / 86400000);
}

function rowBackground(days) {
  if (days === null) return 'transparent';
  if (days <= 30) return '#fff0f0';
  if (days <= 60) return '#fffbe6';
  return 'transparent';
}

function getCellValue(deal, col, stageMap) {
  if (col === 'days_until') return String(daysUntil(deal.contract_end_date) ?? '');
  if (col === 'contract_start_date') return formatDate(deal.contract_start_date);
  if (col === 'contract_end_date') return formatDate(deal.contract_end_date);
  if (col === 'contract_renewal_date') return formatDate(deal.contract_renewal_date);
  if (col === 'stage_id') return (stageMap && stageMap[deal.stage_id]) || deal.stage_id || '';
  return String(deal[col] || '');
}

const exportBtnStyle = {
  padding: '5px 12px',
  fontSize: 12,
  fontWeight: 600,
  color: '#fff',
  background: '#217346',
  border: 'none',
  borderRadius: 5,
  cursor: 'pointer',
};

const thStyle = {
  padding: '10px 14px',
  borderBottom: '1px solid #eee',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 700,
  color: '#555',
  cursor: 'pointer',
  userSelect: 'none',
  whiteSpace: 'nowrap',
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

const tdStyle = {
  padding: '10px 14px',
  borderBottom: '1px solid #f0f0f0',
  fontSize: 13,
  color: '#333',
};

export default function RenewalsTable({ deals, loading, from, to, onFromChange, onToChange, snapshotMode, stageMap, portalId }) {
  const [sortKey, setSortKey] = useState('contract_end_date');
  const [sortDir, setSortDir] = useState('asc');
  const [filters, setFilters] = useState({});

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function setFilter(col, val) {
    setFilters((f) => ({ ...f, [col]: val }));
  }

  function sortIndicator(key) {
    if (sortKey !== key) return ' ↕';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  }

  const columns = [
    ...(!snapshotMode ? [['name', 'Name']] : []),
    ['contract_start_date', 'Contract Start'],
    ['contract_end_date', 'Contract End'],
    ['days_until', 'Days Until Expiry'],
    ['contract_renewal_date', 'Renewal Date'],
    ['stage_id', 'Stage'],
    ['pricing_model', 'Pricing Model'],
    ['deal_source', 'Deal Source'],
  ];

  const sorted = deals ? [...deals].sort((a, b) => {
    let av = a[sortKey] ?? '';
    let bv = b[sortKey] ?? '';
    if (sortKey === 'days_until') {
      av = daysUntil(a.contract_end_date) ?? Infinity;
      bv = daysUntil(b.contract_end_date) ?? Infinity;
    }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  }) : [];

  const filtered = sorted.filter((deal) =>
    columns.every(([col]) => {
      const f = (filters[col] || '').toLowerCase();
      if (!f) return true;
      return getCellValue(deal, col, stageMap).toLowerCase().includes(f);
    })
  );

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 10,
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        padding: '24px 28px',
        marginTop: 32,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>
          Contracts Up for Renewal{hasFilters ? ` (${filtered.length} of ${sorted.length})` : sorted.length > 0 ? ` (${sorted.length})` : ''}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
          {filtered.length > 0 && (
            <button onClick={() => exportToExcel(filtered, snapshotMode, stageMap)} style={exportBtnStyle}>
              Export to Excel
            </button>
          )}
          <span style={{ fontSize: 13, color: '#666' }}>From:</span>
          <input
            type="date"
            value={from}
            onChange={(e) => onFromChange(e.target.value)}
            style={{
              padding: '6px 10px',
              border: '1px solid #ddd',
              borderRadius: 6,
              fontSize: 13,
              fontFamily: 'inherit',
            }}
          />
          <span style={{ fontSize: 13, color: '#666' }}>To:</span>
          <input
            type="date"
            value={to}
            onChange={(e) => onToChange(e.target.value)}
            style={{
              padding: '6px 10px',
              border: '1px solid #ddd',
              borderRadius: 6,
              fontSize: 13,
              fontFamily: 'inherit',
            }}
          />
        </div>
      </div>

      {loading && <p style={{ color: '#888', fontSize: 13 }}>Loading...</p>}

      {!loading && sorted.length === 0 && (
        <p style={{ color: '#888', fontSize: 13 }}>No contracts expiring in this date range.</p>
      )}

      {!loading && sorted.length > 0 && snapshotMode && (
        <p style={{ color: '#999', fontSize: 12, marginBottom: 12 }}>
          Showing anonymized snapshot data. Sync HubSpot for full details.
        </p>
      )}

      {!loading && sorted.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {columns.map(([col, label]) => (
                  <th key={col} style={thStyle} onClick={() => handleSort(col)}>
                    {label}{sortIndicator(col)}
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
              {filtered.map((deal, i) => {
                const days = daysUntil(deal.contract_end_date);
                return (
                  <tr key={deal.id || i} style={{ background: rowBackground(days) }}>
                    {!snapshotMode && (
                      <td style={tdStyle}>
                        {portalId ? (
                          <a href={`https://app.hubspot.com/contacts/${portalId}/deal/${deal.id}`} target="_blank" rel="noreferrer" style={{ color: '#1a56db', textDecoration: 'none', fontWeight: 500 }}>{deal.name || '(Unnamed)'}</a>
                        ) : (deal.name || '(Unnamed)')}
                      </td>
                    )}
                    <td style={tdStyle}>{formatDate(deal.contract_start_date)}</td>
                    <td style={tdStyle}>{formatDate(deal.contract_end_date)}</td>
                    <td style={{ ...tdStyle, fontWeight: days !== null && days <= 30 ? 700 : 400 }}>
                      {days !== null ? `${days}d` : '—'}
                    </td>
                    <td style={tdStyle}>{formatDate(deal.contract_renewal_date)}</td>
                    <td style={{ ...tdStyle, color: '#888', fontSize: 12 }}>{(stageMap && stageMap[deal.stage_id]) || deal.stage_id || '—'}</td>
                    <td style={tdStyle}>{deal.pricing_model || '—'}</td>
                    <td style={tdStyle}>{deal.deal_source || '—'}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={columns.length} style={{ ...tdStyle, color: '#aaa', textAlign: 'center', padding: '16px 14px' }}>
                    No results match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 11, color: '#bbb', display: 'flex', gap: 16 }}>
        <span style={{ display: 'inline-block', width: 12, height: 12, background: '#fff0f0', border: '1px solid #ddd', borderRadius: 2, verticalAlign: 'middle', marginRight: 4 }} />
        <span style={{ fontSize: 12, color: '#888' }}>≤ 30 days</span>
        <span style={{ display: 'inline-block', width: 12, height: 12, background: '#fffbe6', border: '1px solid #ddd', borderRadius: 2, verticalAlign: 'middle', marginRight: 4 }} />
        <span style={{ fontSize: 12, color: '#888' }}>≤ 60 days</span>
      </div>
    </div>
  );
}
