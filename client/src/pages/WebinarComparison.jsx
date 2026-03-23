import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const YEARS = Array.from({ length: 6 }, (_, i) => 2021 + i);

const card = {
  background: '#fff',
  borderRadius: 10,
  padding: '20px 24px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  marginBottom: 20,
};
const selectStyle = {
  padding: '7px 12px',
  border: '1px solid #ddd',
  borderRadius: 6,
  fontSize: 14,
  fontFamily: 'inherit',
  marginRight: 8,
};
const btn = (color = '#ff7a59') => ({
  padding: '8px 18px',
  background: color,
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 13,
  marginRight: 8,
});
const btnOutline = {
  padding: '8px 18px',
  background: '#fff',
  color: '#555',
  border: '1px solid #ddd',
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 13,
  marginRight: 8,
};
const badge = (color) => ({
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 12,
  fontSize: 11,
  fontWeight: 600,
  background: color + '22',
  color: color,
  marginRight: 4,
});

const COLORS = { zoom: '#2D8CFF', eventbrite: '#F05537', both: '#7C3AED', none: '#e2e8f0' };

function StatCard({ label, value, sub, color = '#1a1a2e' }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', minWidth: 130 }}>
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 13, color: '#555', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function SyncPanel({ status, onSyncZoom, onSyncEB, onEnrich, syncing }) {
  const fmt = (t) => t ? new Date(t).toLocaleDateString() : 'Never';
  return (
    <div style={card}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: '#1a1a2e' }}>Data Sources</div>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Zoom</div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
            {status?.zoom?.webinars ?? 0} webinars · {status?.zoom?.attendees ?? 0} attendees<br />
            Last synced: {fmt(status?.zoom?.last_synced)}
          </div>
          <button style={btn('#2D8CFF')} onClick={onSyncZoom} disabled={syncing === 'zoom'}>
            {syncing === 'zoom' ? 'Syncing...' : 'Sync Zoom'}
          </button>
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Eventbrite</div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
            {status?.eventbrite?.events ?? 0} events · {status?.eventbrite?.attendees ?? 0} attendees<br />
            Last synced: {fmt(status?.eventbrite?.last_synced)}
          </div>
          <button style={btn('#F05537')} onClick={onSyncEB} disabled={syncing === 'eb'}>
            {syncing === 'eb' ? 'Syncing...' : 'Sync Eventbrite'}
          </button>
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Contact Email Enrichment</div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
            {status?.emails_enriched ?? 0} deals have contact emails<br />
            Improves match accuracy (uses HubSpot token)
          </div>
          <button style={btnOutline} onClick={onEnrich} disabled={syncing === 'enrich'}>
            {syncing === 'enrich' ? 'Enriching...' : 'Enrich Emails'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WebinarComparison() {
  const now = new Date();
  const currentQ = `Q${Math.ceil((now.getMonth() + 1) / 3)}`;
  const [quarter, setQuarter] = useState(currentQ);
  const [year, setYear] = useState(now.getFullYear());
  const [syncing, setSyncing] = useState(null);
  const [syncMsg, setSyncMsg] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const analysisRef = useRef(null);
  const qc = useQueryClient();

  const statusQ = useQuery({
    queryKey: ['webinar-status'],
    queryFn: () => client.get('/webinar/status').then(r => r.data),
    refetchInterval: false,
  });

  const compareQ = useQuery({
    queryKey: ['webinar-compare', quarter, year],
    queryFn: () => client.get('/webinar/compare', { params: { quarter, year } }).then(r => r.data),
    enabled: true,
  });

  async function syncSource(source) {
    setSyncing(source);
    setSyncMsg(null);
    try {
      const url = source === 'zoom' ? '/webinar/sync/zoom' : source === 'eb' ? '/webinar/sync/eventbrite' : '/webinar/enrich';
      const res = await client.post(url);
      const d = res.data;
      setSyncMsg({
        ok: true,
        text: source === 'zoom'
          ? `Synced ${d.webinars} webinars, ${d.attendees} attendees`
          : source === 'eb'
          ? `Synced ${d.events} events, ${d.attendees} attendees`
          : `Enriched ${d.enriched} deal emails`,
      });
      qc.invalidateQueries({ queryKey: ['webinar-status'] });
      qc.invalidateQueries({ queryKey: ['webinar-compare'] });
    } catch (err) {
      setSyncMsg({ ok: false, text: err.response?.data?.error || err.message });
    } finally {
      setSyncing(null);
    }
  }

  async function runAnalysis() {
    setAnalyzing(true);
    setAnalysis('');
    setActiveTab('analysis');
    try {
      const res = await fetch(`/api/webinar/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quarter, year }),
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          try {
            const d = JSON.parse(line.slice(6));
            if (d.text) { text += d.text; setAnalysis(text); }
            if (d.done || d.error) break;
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      setAnalysis(`Error: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  }

  const data = compareQ.data;
  const stats = data?.stats;
  const clients = data?.clients || [];

  const pieData = stats ? [
    { name: 'Zoom only', value: stats.attended_zoom - stats.attended_both },
    { name: 'Eventbrite only', value: stats.attended_eventbrite - stats.attended_both },
    { name: 'Both', value: stats.attended_both },
    { name: 'Neither', value: stats.attended_none },
  ].filter(d => d.value > 0) : [];

  const pieColors = ['#2D8CFF', '#F05537', '#7C3AED', '#e2e8f0'];

  const attended = clients.filter(c => c.attended_either);
  const notAttended = clients.filter(c => !c.attended_either);

  const tabStyle = (active) => ({
    padding: '8px 16px',
    border: 'none',
    borderBottom: active ? '2px solid #ff7a59' : '2px solid transparent',
    background: 'none',
    cursor: 'pointer',
    fontWeight: active ? 700 : 500,
    fontSize: 14,
    color: active ? '#ff7a59' : '#555',
    marginRight: 4,
  });

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', marginBottom: 6 }}>Webinar Comparison</h1>
      <p style={{ fontSize: 14, color: '#666', marginBottom: 20 }}>
        Compare clients who launched in a quarter against Zoom &amp; Eventbrite webinar attendance.
      </p>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <select style={selectStyle} value={quarter} onChange={e => setQuarter(e.target.value)}>
          {QUARTERS.map(q => <option key={q}>{q}</option>)}
        </select>
        <select style={selectStyle} value={year} onChange={e => setYear(Number(e.target.value))}>
          {YEARS.map(y => <option key={y}>{y}</option>)}
        </select>
        <button style={btn()} onClick={runAnalysis} disabled={analyzing || !data}>
          {analyzing ? 'Analyzing...' : 'Run AI Analysis'}
        </button>
        {syncMsg && (
          <span style={{ fontSize: 13, color: syncMsg.ok ? '#2e7d32' : '#c62828' }}>{syncMsg.text}</span>
        )}
      </div>

      {/* Sync panel */}
      <SyncPanel
        status={statusQ.data}
        onSyncZoom={() => syncSource('zoom')}
        onSyncEB={() => syncSource('eb')}
        onEnrich={() => syncSource('enrich')}
        syncing={syncing}
      />

      {compareQ.isLoading && <div style={{ color: '#888', padding: 20 }}>Loading...</div>}

      {data && (
        <>
          {/* Stat cards */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            <StatCard label="Launched Clients" value={stats.total_launched} color="#1a1a2e" />
            <StatCard label="Attended Zoom" value={stats.attended_zoom} sub={`${(stats.zoom_rate * 100).toFixed(0)}%`} color="#2D8CFF" />
            <StatCard label="Attended Eventbrite" value={stats.attended_eventbrite} sub={`${(stats.eb_rate * 100).toFixed(0)}%`} color="#F05537" />
            <StatCard label="Attended Either" value={stats.attended_either} sub={`${(stats.either_rate * 100).toFixed(0)}%`} color="#7C3AED" />
            <StatCard label="No Attendance" value={stats.attended_none} color="#999" />
          </div>

          {/* Tabs */}
          <div style={{ borderBottom: '1px solid #eee', marginBottom: 20 }}>
            {['overview', 'attended', 'not attended', 'webinars', 'analysis'].map(tab => (
              <button key={tab} style={tabStyle(activeTab === tab)} onClick={() => setActiveTab(tab)}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'attended' && ` (${attended.length})`}
                {tab === 'not attended' && ` (${notAttended.length})`}
              </button>
            ))}
          </div>

          {/* Overview tab */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ ...card, flex: 1, minWidth: 280 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Attendance Breakdown</div>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                        {pieData.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ color: '#aaa', fontSize: 13, paddingTop: 20 }}>No data — sync Zoom/Eventbrite first</div>
                )}
              </div>
              <div style={{ ...card, flex: 1, minWidth: 280 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Platform Comparison</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={[
                    { name: 'Zoom', count: stats.attended_zoom },
                    { name: 'Eventbrite', count: stats.attended_eventbrite },
                    { name: 'Both', count: stats.attended_both },
                  ]}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#ff7a59" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Attended tab */}
          {activeTab === 'attended' && (
            <div style={card}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
                Clients Who Attended Webinars ({attended.length})
              </div>
              {attended.length === 0 ? (
                <div style={{ color: '#aaa', fontSize: 13 }}>No matches found for this quarter.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #eee' }}>
                      {['Client', 'Launch Date', 'Zoom', 'Eventbrite', 'Match'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '6px 10px', color: '#555', fontWeight: 600, fontSize: 12 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {attended.map(c => (
                      <tr key={c.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 500 }}>{c.name}</td>
                        <td style={{ padding: '8px 10px', color: '#666' }}>{c.launched_at ? new Date(c.launched_at).toLocaleDateString() : '—'}</td>
                        <td style={{ padding: '8px 10px' }}>
                          {c.zoom_matches.length > 0 && (
                            <span title={c.zoom_matches.map(m => `${m.webinar_topic} (${m.name})`).join(', ')}>
                              <span style={badge('#2D8CFF')}>{c.zoom_matches.length} webinar{c.zoom_matches.length > 1 ? 's' : ''}</span>
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          {c.eb_matches.length > 0 && (
                            <span title={c.eb_matches.map(m => `${m.event_name} (${m.name})`).join(', ')}>
                              <span style={badge('#F05537')}>{c.eb_matches.length} event{c.eb_matches.length > 1 ? 's' : ''}</span>
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={badge(c.match_method === 'email' ? '#2e7d32' : '#f59e0b')}>
                            {c.match_method}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Not attended tab */}
          {activeTab === 'not attended' && (
            <div style={card}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
                Clients With No Webinar Attendance ({notAttended.length})
              </div>
              {notAttended.length === 0 ? (
                <div style={{ color: '#888', fontSize: 13 }}>All clients attended at least one webinar!</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #eee' }}>
                      {['Client', 'Launch Date', 'Size', 'Email Available'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '6px 10px', color: '#555', fontWeight: 600, fontSize: 12 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {notAttended.map(c => (
                      <tr key={c.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 500 }}>{c.name}</td>
                        <td style={{ padding: '8px 10px', color: '#666' }}>{c.launched_at ? new Date(c.launched_at).toLocaleDateString() : '—'}</td>
                        <td style={{ padding: '8px 10px', color: '#666' }}>{c.size_value || '—'}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={badge(c.contact_email ? '#2e7d32' : '#999')}>
                            {c.contact_email ? 'yes' : 'no'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Webinars tab */}
          {activeTab === 'webinars' && (
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ ...card, flex: 1, minWidth: 280 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
                  Zoom Webinars ({data.webinars.zoom.length})
                </div>
                {data.webinars.zoom.length === 0
                  ? <div style={{ color: '#aaa', fontSize: 13 }}>None synced for this quarter</div>
                  : data.webinars.zoom.map(w => (
                    <div key={w.webinar_id} style={{ padding: '8px 0', borderBottom: '1px solid #f5f5f5', fontSize: 13 }}>
                      <div style={{ fontWeight: 500 }}>{w.topic || '(Untitled)'}</div>
                      <div style={{ color: '#888', fontSize: 12 }}>{w.start_time ? new Date(w.start_time).toLocaleDateString() : ''}</div>
                    </div>
                  ))
                }
              </div>
              <div style={{ ...card, flex: 1, minWidth: 280 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
                  Eventbrite Events ({data.webinars.eventbrite.length})
                </div>
                {data.webinars.eventbrite.length === 0
                  ? <div style={{ color: '#aaa', fontSize: 13 }}>None synced for this quarter</div>
                  : data.webinars.eventbrite.map(e => (
                    <div key={e.event_id} style={{ padding: '8px 0', borderBottom: '1px solid #f5f5f5', fontSize: 13 }}>
                      <div style={{ fontWeight: 500 }}>{e.name || '(Untitled)'}</div>
                      <div style={{ color: '#888', fontSize: 12 }}>{e.start_time ? new Date(e.start_time).toLocaleDateString() : ''}</div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {/* Analysis tab */}
          {activeTab === 'analysis' && (
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>AI Analysis — {quarter} {year}</div>
                <button style={btn()} onClick={runAnalysis} disabled={analyzing}>
                  {analyzing ? 'Analyzing...' : 'Re-run Analysis'}
                </button>
              </div>
              {analysis ? (
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 14, lineHeight: 1.7, color: '#1a1a2e', margin: 0 }} ref={analysisRef}>
                  {analysis}
                  {analyzing && <span style={{ color: '#ff7a59' }}>▊</span>}
                </pre>
              ) : (
                <div style={{ color: '#aaa', fontSize: 14 }}>
                  {analyzing ? 'Generating analysis...' : 'Click "Run AI Analysis" to get insights.'}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
