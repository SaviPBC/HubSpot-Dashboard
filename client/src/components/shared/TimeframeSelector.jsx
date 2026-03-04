import { useState } from 'react';

const PRESETS = [
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '6 months', days: 183 },
  { label: '1 year', days: 365 },
];

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

export default function TimeframeSelector({ from, to, onChange }) {
  const [custom, setCustom] = useState(false);

  function selectPreset(days) {
    setCustom(false);
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    onChange(toDateStr(fromDate), toDateStr(toDate));
  }

  function isActive(days) {
    if (custom) return false;
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    return from === toDateStr(fromDate) && to === toDateStr(toDate);
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {PRESETS.map((p) => (
        <button
          key={p.days}
          onClick={() => selectPreset(p.days)}
          style={{
            padding: '5px 14px',
            borderRadius: 20,
            border: '1px solid #ddd',
            background: isActive(p.days) ? '#ff7a59' : '#fff',
            color: isActive(p.days) ? '#fff' : '#333',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          {p.label}
        </button>
      ))}
      <button
        onClick={() => setCustom(true)}
        style={{
          padding: '5px 14px',
          borderRadius: 20,
          border: '1px solid #ddd',
          background: custom ? '#ff7a59' : '#fff',
          color: custom ? '#fff' : '#333',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        Custom
      </button>
      {custom && (
        <>
          <input
            type="date"
            value={from}
            onChange={(e) => onChange(e.target.value, to)}
            style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13 }}
          />
          <span style={{ fontSize: 13, color: '#666' }}>to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => onChange(from, e.target.value)}
            style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13 }}
          />
        </>
      )}
    </div>
  );
}
