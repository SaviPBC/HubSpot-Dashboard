import { useState } from 'react';
import * as XLSX from 'xlsx';

function exportToExcel(deals, snapshotMode) {
  const rows = deals.map((deal) => {
    const endDate = deal.contract_end_date
      ? (isNaN(Number(deal.contract_end_date)) ? new Date(deal.contract_end_date) : new Date(Number(deal.contract_end_date)))
      : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntilExpiry = endDate && !isNaN(endDate.getTime())
      ? Math.ceil((endDate.getTime() - today.getTime()) / 86400000)
      : null;
    const fmt = (d) => {
      if (!d) return '';
      const parsed = isNaN(Number(d)) ? new Date(d) : new Date(Number(d));
      return isNaN(parsed.getTime()) ? d : parsed.toLocaleDateString();
    };
    const base = {
      'Contract Start': fmt(deal.contract_start_date),
      'Contract End': fmt(deal.contract_end_date),
      'Days Until Expiry': daysUntilExpiry !== null ? daysUntilExpiry : '',
      'Renewal Date': fmt(deal.contract_renewal_date),
      Stage: deal.stage_id || '',
    };
    if (!snapshotMode) return { Name: deal.name || '', ...base };
    return base;
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Contracts for Renewal');
  XLSX.writeFile(wb, 'contracts-for-renewal.xlsx');
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
  borderBottom: '2px solid #eee',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 700,
  color: '#555',
  cursor: 'pointer',
  userSelect: 'none',
  whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '10px 14px',
  borderBottom: '1px solid #f0f0f0',
  fontSize: 13,
  color: '#333',
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  // HubSpot dates can be ISO strings or timestamps (ms)
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

export default function RenewalsTable({ deals, loading, from, to, onFromChange, onToChange, snapshotMode }) {
  const [sortKey, setSortKey] = useState('contract_end_date');
  const [sortDir, setSortDir] = useState('asc');

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function sortIndicator(key) {
    if (sortKey !== key) return ' ↕';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  }

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
          Contracts Up for Renewal
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
          {sorted.length > 0 && (
            <button onClick={() => exportToExcel(sorted, snapshotMode)} style={exportBtnStyle}>
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
                {!snapshotMode && (
                  <th style={thStyle} onClick={() => handleSort('name')}>
                    Name{sortIndicator('name')}
                  </th>
                )}
                <th style={thStyle} onClick={() => handleSort('contract_start_date')}>
                  Contract Start{sortIndicator('contract_start_date')}
                </th>
                <th style={thStyle} onClick={() => handleSort('contract_end_date')}>
                  Contract End{sortIndicator('contract_end_date')}
                </th>
                <th style={thStyle} onClick={() => handleSort('days_until')}>
                  Days Until Expiry{sortIndicator('days_until')}
                </th>
                <th style={thStyle} onClick={() => handleSort('contract_renewal_date')}>
                  Renewal Date{sortIndicator('contract_renewal_date')}
                </th>
                <th style={thStyle} onClick={() => handleSort('stage_id')}>
                  Stage{sortIndicator('stage_id')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((deal, i) => {
                const days = daysUntil(deal.contract_end_date);
                return (
                  <tr key={deal.id || i} style={{ background: rowBackground(days) }}>
                    {!snapshotMode && <td style={tdStyle}>{deal.name || '(Unnamed)'}</td>}
                    <td style={tdStyle}>{formatDate(deal.contract_start_date)}</td>
                    <td style={tdStyle}>{formatDate(deal.contract_end_date)}</td>
                    <td style={{ ...tdStyle, fontWeight: days !== null && days <= 30 ? 700 : 400 }}>
                      {days !== null ? `${days}d` : '—'}
                    </td>
                    <td style={tdStyle}>{formatDate(deal.contract_renewal_date)}</td>
                    <td style={{ ...tdStyle, color: '#888', fontSize: 12 }}>{deal.stage_id || '—'}</td>
                  </tr>
                );
              })}
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
