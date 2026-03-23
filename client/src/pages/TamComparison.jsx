import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import * as XLSX from 'xlsx';
import api from '../api/client';

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtNum(n) {
  if (!n && n !== 0) return '—';
  return Math.round(n).toLocaleString();
}

const QUARTER_LABELS = { 1: 'Q1 (Jan–Mar)', 2: 'Q2 (Apr–Jun)', 3: 'Q3 (Jul–Sep)', 4: 'Q4 (Oct–Dec)' };
const COLOR1 = '#1565c0';
const COLOR2 = '#ff7a59';

function computeStats(deals) {
  const sizes = deals.map((d) => parseFloat(d.size_value)).filter((n) => !isNaN(n) && n > 0);
  const networks = deals.map((d) => parseFloat(d.network_value)).filter((n) => !isNaN(n) && n > 0);
  const sum = (arr) => arr.reduce((a, b) => a + b, 0);
  const avg = (arr) => (arr.length ? sum(arr) / arr.length : 0);
  const median = (arr) => {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  };
  return {
    count: deals.length,
    size: { total: sum(sizes), avg: avg(sizes), median: median(sizes), min: sizes.length ? Math.min(...sizes) : 0, max: sizes.length ? Math.max(...sizes) : 0 },
    network: { total: sum(networks), avg: avg(networks), median: median(networks), min: networks.length ? Math.min(...networks) : 0, max: networks.length ? Math.max(...networks) : 0 },
  };
}

function StatCard({ label, value1, value2, year1, year2 }) {
  return (
    <div style={statCardStyle}>
      <div style={{ fontSize: 11, color: '#888', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: COLOR1, fontWeight: 700, marginBottom: 2 }}>{year1}</div>
          <div style={{ fontSize: 19, fontWeight: 700, color: '#1a1a2e' }}>{fmtNum(value1)}</div>
        </div>
        <div style={{ width: 1, background: '#eee' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: COLOR2, fontWeight: 700, marginBottom: 2 }}>{year2}</div>
          <div style={{ fontSize: 19, fontWeight: 700, color: '#1a1a2e' }}>{fmtNum(value2)}</div>
        </div>
      </div>
    </div>
  );
}

function DealTable({ deals, allDeals, year, color, portalId, excludedIds, onToggle }) {
  const [filter, setFilter] = useState('');

  const visible = allDeals.filter((d) =>
    (d.name || '').toLowerCase().includes(filter.toLowerCase())
  );
  const excludedCount = allDeals.filter((d) => excludedIds.has(d.id)).length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: '#1a1a2e' }}>
          {year}
          <span style={{ fontSize: 12, fontWeight: 400, color: '#888', marginLeft: 6 }}>
            {deals.length} included{excludedCount > 0 ? `, ${excludedCount} excluded` : ''}
          </span>
        </h4>
        <input
          placeholder="Filter…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ padding: '3px 8px', fontSize: 12, border: '1px solid #ddd', borderRadius: 4, fontFamily: 'inherit', marginLeft: 'auto', width: 120 }}
        />
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: 28, padding: '6px 8px' }} />
              <th style={thStyle}>Name</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Employees</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Network</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Launched</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((deal, i) => {
              const excluded = excludedIds.has(deal.id);
              return (
                <tr key={deal.id} style={{ background: excluded ? '#fafafa' : i % 2 === 0 ? '#fff' : '#f9fbff', opacity: excluded ? 0.45 : 1 }}>
                  <td style={{ padding: '6px 8px', borderBottom: '1px solid #f0f0f0', textAlign: 'center' }}>
                    <button
                      onClick={() => onToggle(deal.id)}
                      title={excluded ? 'Include in analysis' : 'Exclude from analysis'}
                      style={{
                        width: 20,
                        height: 20,
                        border: `1.5px solid ${excluded ? '#4caf50' : '#e53935'}`,
                        borderRadius: 4,
                        background: 'none',
                        cursor: 'pointer',
                        fontSize: 11,
                        fontWeight: 700,
                        color: excluded ? '#4caf50' : '#e53935',
                        lineHeight: 1,
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {excluded ? '+' : '×'}
                    </button>
                  </td>
                  <td style={{ ...tdStyle, textDecoration: excluded ? 'line-through' : 'none', color: excluded ? '#999' : '#333' }}>
                    {portalId ? (
                      <a
                        href={`https://app.hubspot.com/contacts/${portalId}/deal/${deal.id}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: excluded ? '#aaa' : '#1a56db', textDecoration: 'none', fontWeight: 500 }}
                      >
                        {deal.name}
                      </a>
                    ) : deal.name}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: excluded ? '#bbb' : '#333' }}>
                    {deal.size_value ? Number(deal.size_value).toLocaleString() : '—'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: excluded ? '#bbb' : '#333' }}>
                    {deal.network_value ? Number(deal.network_value).toLocaleString() : '—'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center', color: excluded ? '#bbb' : '#666', fontSize: 12 }}>
                    {fmtDate(deal.launched_at)}
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} style={{ ...tdStyle, color: '#aaa', textAlign: 'center', padding: 16 }}>No results.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function exportToExcel(cohort1, cohort2, stats1, stats2, quarter, year1, year2, excludedIds) {
  const wb = XLSX.utils.book_new();
  const qLabel = `Q${quarter}`;
  const excluded = excludedIds.size > 0 ? ' (excl. outliers)' : '';

  const summaryRows = [
    { Metric: 'Included Clients', [`${year1} ${qLabel}`]: stats1.count, [`${year2} ${qLabel}`]: stats2.count },
    { Metric: 'Total Employees', [`${year1} ${qLabel}`]: Math.round(stats1.size.total), [`${year2} ${qLabel}`]: Math.round(stats2.size.total) },
    { Metric: 'Avg Employees', [`${year1} ${qLabel}`]: Math.round(stats1.size.avg), [`${year2} ${qLabel}`]: Math.round(stats2.size.avg) },
    { Metric: 'Median Employees', [`${year1} ${qLabel}`]: Math.round(stats1.size.median), [`${year2} ${qLabel}`]: Math.round(stats2.size.median) },
    { Metric: 'Total Network (Employers)', [`${year1} ${qLabel}`]: Math.round(stats1.network.total), [`${year2} ${qLabel}`]: Math.round(stats2.network.total) },
    { Metric: 'Avg Network', [`${year1} ${qLabel}`]: Math.round(stats1.network.avg), [`${year2} ${qLabel}`]: Math.round(stats2.network.avg) },
    { Metric: 'Median Network', [`${year1} ${qLabel}`]: Math.round(stats1.network.median), [`${year2} ${qLabel}`]: Math.round(stats2.network.median) },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), `Summary${excluded}`);

  for (const [cohort, year] of [[cohort1, year1], [cohort2, year2]]) {
    const rows = cohort.map((d) => ({
      Name: d.name || '',
      Status: excludedIds.has(d.id) ? 'Excluded' : 'Included',
      'Launch Date': d.launched_at || '',
      'Employees (Size)': d.size_value ? Number(d.size_value) : '',
      'Network (Employers)': d.network_value ? Number(d.network_value) : '',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), `${year} ${qLabel}`);
  }

  XLSX.writeFile(wb, `tam-comparison-${qLabel}-${year1}-vs-${year2}.xlsx`);
}

export default function TamComparison() {
  const currentYear = new Date().getFullYear();
  const [year1, setYear1] = useState(currentYear - 1);
  const [year2, setYear2] = useState(currentYear);
  const [quarter, setQuarter] = useState(1);
  const [activeTab, setActiveTab] = useState('charts');
  const [excludedIds, setExcludedIds] = useState(new Set());

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['tam-comparison', year1, year2, quarter],
    queryFn: () =>
      api.get('/analysis/tam-comparison', { params: { year1, year2, quarter } }).then((r) => r.data),
    onSuccess: () => setExcludedIds(new Set()), // reset exclusions when cohort changes
  });

  const qLabel = `Q${quarter}`;

  function toggleExclude(id) {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function resetExclusions() {
    setExcludedIds(new Set());
  }

  // Active (included) deals for each cohort
  const active1 = useMemo(
    () => (data?.cohort1.deals || []).filter((d) => !excludedIds.has(d.id)),
    [data, excludedIds]
  );
  const active2 = useMemo(
    () => (data?.cohort2.deals || []).filter((d) => !excludedIds.has(d.id)),
    [data, excludedIds]
  );

  // Stats computed from active deals only
  const stats1 = useMemo(() => computeStats(active1), [active1]);
  const stats2 = useMemo(() => computeStats(active2), [active2]);

  const sizeChartData = data
    ? [
        { metric: 'Total', [year1]: Math.round(stats1.size.total), [year2]: Math.round(stats2.size.total) },
        { metric: 'Average', [year1]: Math.round(stats1.size.avg), [year2]: Math.round(stats2.size.avg) },
        { metric: 'Median', [year1]: Math.round(stats1.size.median), [year2]: Math.round(stats2.size.median) },
      ]
    : [];

  const networkChartData = data
    ? [
        { metric: 'Total', [year1]: Math.round(stats1.network.total), [year2]: Math.round(stats2.network.total) },
        { metric: 'Average', [year1]: Math.round(stats1.network.avg), [year2]: Math.round(stats2.network.avg) },
        { metric: 'Median', [year1]: Math.round(stats1.network.median), [year2]: Math.round(stats2.network.median) },
      ]
    : [];

  const excludedCount = excludedIds.size;

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={labelStyle}>Quarter:</label>
          <select value={quarter} onChange={(e) => { setQuarter(Number(e.target.value)); setExcludedIds(new Set()); }} style={selectStyle}>
            {[1, 2, 3, 4].map((q) => (
              <option key={q} value={q}>{QUARTER_LABELS[q]}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={labelStyle}>Year 1:</label>
          <select value={year1} onChange={(e) => { setYear1(Number(e.target.value)); setExcludedIds(new Set()); }} style={selectStyle}>
            {Array.from({ length: 8 }, (_, i) => currentYear - 5 + i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={labelStyle}>Year 2:</label>
          <select value={year2} onChange={(e) => { setYear2(Number(e.target.value)); setExcludedIds(new Set()); }} style={selectStyle}>
            {Array.from({ length: 8 }, (_, i) => currentYear - 5 + i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        {excludedCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#e53935', fontWeight: 600 }}>
              {excludedCount} client{excludedCount !== 1 ? 's' : ''} excluded
            </span>
            <button onClick={resetExclusions} style={resetBtnStyle}>Reset</button>
          </div>
        )}
        {data && (
          <button
            onClick={() => exportToExcel(data.cohort1.deals, data.cohort2.deals, stats1, stats2, quarter, year1, year2, excludedIds)}
            style={exportBtnStyle}
          >
            Export to Excel
          </button>
        )}
      </div>

      {isLoading && <p style={{ color: '#888' }}>Loading…</p>}
      {isError && <p style={{ color: '#c62828' }}>Error: {error?.response?.data?.error || error?.message}</p>}

      {data && (
        <>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14, marginBottom: 24 }}>
            <StatCard label="Included Clients" value1={stats1.count} value2={stats2.count} year1={`${year1} ${qLabel}`} year2={`${year2} ${qLabel}`} />
            <StatCard label="Total Employees" value1={stats1.size.total} value2={stats2.size.total} year1={`${year1} ${qLabel}`} year2={`${year2} ${qLabel}`} />
            <StatCard label="Avg Employees" value1={stats1.size.avg} value2={stats2.size.avg} year1={`${year1} ${qLabel}`} year2={`${year2} ${qLabel}`} />
            <StatCard label="Median Employees" value1={stats1.size.median} value2={stats2.size.median} year1={`${year1} ${qLabel}`} year2={`${year2} ${qLabel}`} />
            <StatCard label="Total Network (Employers)" value1={stats1.network.total} value2={stats2.network.total} year1={`${year1} ${qLabel}`} year2={`${year2} ${qLabel}`} />
            <StatCard label="Avg Network" value1={stats1.network.avg} value2={stats2.network.avg} year1={`${year1} ${qLabel}`} year2={`${year2} ${qLabel}`} />
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[['charts', 'Charts'], ['deals', 'Manage Clients']].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                style={{
                  padding: '6px 16px', fontSize: 13, fontWeight: 600, borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: activeTab === id ? '#1565c0' : '#eee',
                  color: activeTab === id ? '#fff' : '#555',
                }}
              >
                {label}
                {id === 'deals' && excludedCount > 0 && (
                  <span style={{ marginLeft: 6, background: '#e53935', color: '#fff', borderRadius: 10, fontSize: 10, padding: '1px 6px', fontWeight: 700 }}>
                    {excludedCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {activeTab === 'charts' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div style={cardStyle}>
                  <h3 style={titleStyle}>Employees (Size) — {year1} vs {year2} {qLabel}</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={sizeChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="metric" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => v.toLocaleString()} />
                      <Legend />
                      <Bar dataKey={String(year1)} fill={COLOR1} radius={[3, 3, 0, 0]} />
                      <Bar dataKey={String(year2)} fill={COLOR2} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div style={cardStyle}>
                  <h3 style={titleStyle}>Network (Employers) — {year1} vs {year2} {qLabel}</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={networkChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="metric" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => v.toLocaleString()} />
                      <Legend />
                      <Bar dataKey={String(year1)} fill={COLOR1} radius={[3, 3, 0, 0]} />
                      <Bar dataKey={String(year2)} fill={COLOR2} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Per-client chips */}
              <div style={cardStyle}>
                <h3 style={titleStyle}>Per-Client Size (included only)</h3>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  {[[data.cohort1, year1, COLOR1], [data.cohort2, year2, COLOR2]].map(([cohort, yr, color]) => (
                    <div key={yr} style={{ flex: 1, minWidth: 280 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 8 }}>
                        {yr} {qLabel} ({(cohort.deals.filter((d) => !excludedIds.has(d.id))).length} clients)
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {[...cohort.deals]
                          .sort((a, b) => Number(b.size_value) - Number(a.size_value))
                          .filter((d) => !excludedIds.has(d.id))
                          .map((d) => {
                            const size = Number(d.size_value);
                            const lbl = size >= 1000000 ? `${(size / 1000000).toFixed(1)}M` : size >= 1000 ? `${(size / 1000).toFixed(0)}K` : String(size);
                            return (
                              <div
                                key={d.id}
                                title={`${d.name}: ${size.toLocaleString()} employees — click to exclude`}
                                onClick={() => toggleExclude(d.id)}
                                style={{
                                  padding: '3px 8px',
                                  background: yr === year1 ? 'rgba(21,101,192,0.08)' : 'rgba(255,122,89,0.1)',
                                  border: `1px solid ${yr === year1 ? 'rgba(21,101,192,0.25)' : 'rgba(255,122,89,0.3)'}`,
                                  borderRadius: 4, fontSize: 11, color: '#333', whiteSpace: 'nowrap',
                                }}
                              >
                                {d.name?.split(' ').slice(0, 3).join(' ')} · {lbl}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'deals' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {[[data.cohort1, year1, COLOR1], [data.cohort2, year2, COLOR2]].map(([cohort, yr, color]) => (
                <div key={yr} style={cardStyle}>
                  <DealTable
                    deals={cohort.deals.filter((d) => !excludedIds.has(d.id))}
                    allDeals={cohort.deals}
                    year={`${yr} ${qLabel}`}
                    color={color}
                    portalId={data.portalId}
                    excludedIds={excludedIds}
                    onToggle={toggleExclude}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}


const cardStyle = { background: '#fff', borderRadius: 10, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' };
const titleStyle = { fontSize: 14, fontWeight: 600, color: '#1a1a2e', marginBottom: 16 };
const statCardStyle = { background: '#fff', borderRadius: 10, padding: '14px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' };
const labelStyle = { fontSize: 13, color: '#555', fontWeight: 500 };
const selectStyle = { padding: '5px 10px', fontSize: 13, border: '1px solid #ddd', borderRadius: 6, fontFamily: 'inherit', background: '#fff', cursor: 'pointer' };
const exportBtnStyle = { marginLeft: 'auto', padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#fff', background: '#217346', border: 'none', borderRadius: 6, cursor: 'pointer' };
const resetBtnStyle = { padding: '4px 10px', fontSize: 12, fontWeight: 600, color: '#e53935', background: 'none', border: '1.5px solid #e53935', borderRadius: 5, cursor: 'pointer' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const thStyle = { textAlign: 'left', padding: '7px 10px', borderBottom: '1px solid #eee', color: '#555', fontWeight: 600, whiteSpace: 'nowrap' };
const tdStyle = { padding: '7px 10px', borderBottom: '1px solid #f0f0f0' };
