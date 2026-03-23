const router = require('express').Router();
const db = require('../db');

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
    size: {
      total: sum(sizes),
      avg: avg(sizes),
      median: median(sizes),
      min: sizes.length ? Math.min(...sizes) : 0,
      max: sizes.length ? Math.max(...sizes) : 0,
      missing: deals.length - sizes.length,
    },
    network: {
      total: sum(networks),
      avg: avg(networks),
      median: median(networks),
      min: networks.length ? Math.min(...networks) : 0,
      max: networks.length ? Math.max(...networks) : 0,
      missing: deals.length - networks.length,
    },
  };
}

// GET /api/analysis/tam-comparison?year1=2025&year2=2026&quarter=1
router.get('/tam-comparison', (req, res) => {
  const year1 = parseInt(req.query.year1 || '2025', 10);
  const year2 = parseInt(req.query.year2 || '2026', 10);
  const quarter = parseInt(req.query.quarter || '1', 10);

  // Quarter date ranges
  const quarterRanges = {
    1: { from: '01-01', to: '03-31' },
    2: { from: '04-01', to: '06-30' },
    3: { from: '07-01', to: '09-30' },
    4: { from: '10-01', to: '12-31' },
  };
  const { from: qFrom, to: qTo } = quarterRanges[quarter] || quarterRanges[1];

  const fetch = (year) =>
    db
      .prepare(
        `SELECT id, name, launched_at, size_value, network_value, pricing_model, deal_source
         FROM deals
         WHERE launched_at >= ? AND launched_at <= ?
         ORDER BY launched_at`
      )
      .all([`${year}-${qFrom}`, `${year}-${qTo}T23:59:59Z`]);

  const deals1 = fetch(year1);
  const deals2 = fetch(year2);

  const portalId = db.prepare("SELECT value FROM settings WHERE key='hubspot_portal_id'").get();

  res.json({
    quarter,
    cohort1: { year: year1, deals: deals1, stats: computeStats(deals1) },
    cohort2: { year: year2, deals: deals2, stats: computeStats(deals2) },
    portalId: portalId ? portalId.value : null,
  });
});

module.exports = router;
