const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const db = require('../db');

const SNAPSHOT_PATH = path.resolve(__dirname, '../data/snapshots.json');

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key=?').get(key);
  return row ? row.value : null;
}

const SIZE_BUCKETS = [
  { label: '1-100', min: 1, max: 100 },
  { label: '101-500', min: 101, max: 500 },
  { label: '501-1K', min: 501, max: 1000 },
  { label: '1K-5K', min: 1001, max: 5000 },
  { label: '5K-10K', min: 5001, max: 10000 },
  { label: '10K-50K', min: 10001, max: 50000 },
  { label: '50K+', min: 50001, max: Infinity },
];

function bucketSizeDistribution(rows) {
  const buckets = {};
  let unknown = 0;
  for (const bucket of SIZE_BUCKETS) buckets[bucket.label] = 0;

  for (const row of rows) {
    const num = parseInt(row.size, 10);
    if (row.size === 'Unknown' || isNaN(num) || num <= 0) {
      unknown += row.count;
      continue;
    }
    const bucket = SIZE_BUCKETS.find((b) => num >= b.min && num <= b.max);
    if (bucket) buckets[bucket.label] += row.count;
    else unknown += row.count;
  }

  const result = SIZE_BUCKETS.map((b) => ({ size: b.label, count: buckets[b.label] }))
    .filter((r) => r.count > 0);
  if (unknown > 0) result.unshift({ size: 'Unknown', count: unknown });
  return result;
}

function getLatestSnapshot() {
  if (!fs.existsSync(SNAPSHOT_PATH)) return null;
  const snapshots = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf-8'));
  if (!Array.isArray(snapshots) || snapshots.length === 0) return null;
  return snapshots[snapshots.length - 1];
}

router.get('/', (req, res) => {
  const { from, to } = req.query;

  const implementingIds = JSON.parse(getSetting('implementing_stage_ids') || '[]');
  const launchedIds = JSON.parse(getSetting('launched_stage_ids') || '[]');

  // Total deals in DB
  const { total } = db.prepare('SELECT COUNT(*) AS total FROM deals').get();

  // If DB is empty, fall back to latest snapshot for metrics
  if (total === 0) {
    const snapshot = getLatestSnapshot();
    if (snapshot && snapshot.metrics) {
      const m = snapshot.metrics;

      // Filter launched_by_month to requested period
      let launchedByMonth = m.launched_by_month || [];
      let launchedBySize = m.launched_by_size || [];
      let launchedInPeriod = null; // null = unknown
      if (launchedByMonth.length > 0) {
        if (from || to) {
          const fromMonth = from ? from.slice(0, 7) : '0000-00';
          const toMonth = to ? to.slice(0, 7) : '9999-99';
          launchedByMonth = launchedByMonth.filter(
            (r) => r.month >= fromMonth && r.month <= toMonth
          );
        }
        launchedInPeriod = launchedByMonth.reduce((sum, r) => sum + r.count, 0);
      }

      // Filter renewal deals to requested renewal period (frontend sends its own from/to)
      return res.json({
        source: 'snapshot',
        snapshotTimestamp: snapshot.timestamp,
        dataRange: m.date_range || null,
        summary: {
          total: m.total,
          implementing: m.implementing,
          launchedInPeriod,
        },
        sizeDistribution: bucketSizeDistribution(m.size_distribution || []),
        implementingSizeDistribution: bucketSizeDistribution(m.implementing_size_distribution || []),
        implementing: m.implementing_deals || [],
        launched: [],
        launchedByMonth,
        launchedBySize,
      });
    }
  }

  // Currently implementing: deals whose stage_id is in the implementing list
  let implementing = [];
  if (implementingIds.length > 0) {
    const placeholders = implementingIds.map(() => '?').join(',');
    implementing = db
      .prepare(
        `SELECT id, name, pipeline, stage_id, size_value, network_value, created_at, launched_at
         FROM deals WHERE stage_id IN (${placeholders})
         ORDER BY created_at DESC`
      )
      .all(implementingIds);
  }

  // Launched in period: any deal with a launched_at date in [from, to]
  // (regardless of current stage — a deal may have moved forward after being launched)
  let launched = [];
  if (launchedIds.length > 0) {
    let launchedQuery = `SELECT id, name, pipeline, stage_id, size_value, network_value, created_at, launched_at
       FROM deals WHERE launched_at IS NOT NULL`;
    const params = [];

    if (from) {
      launchedQuery += ' AND launched_at >= ?';
      params.push(from);
    }
    if (to) {
      launchedQuery += ' AND launched_at <= ?';
      params.push(to + 'T23:59:59Z');
    }
    launchedQuery += ' ORDER BY launched_at DESC';

    launched = db.prepare(launchedQuery).all(params);
  }

  // Size distribution across all deals
  const sizeRows = db
    .prepare(
      `SELECT COALESCE(size_value, 'Unknown') AS size, COUNT(*) AS count
       FROM deals GROUP BY size ORDER BY count DESC`
    )
    .all();

  // Size distribution for implementing deals
  let implementingSizeDist = [];
  if (implementingIds.length > 0) {
    const placeholders = implementingIds.map(() => '?').join(',');
    implementingSizeDist = db
      .prepare(
        `SELECT COALESCE(size_value, 'Unknown') AS size, COUNT(*) AS count
         FROM deals WHERE stage_id IN (${placeholders})
         GROUP BY size ORDER BY count DESC`
      )
      .all(implementingIds);
  }

  // Data range for live DB — use launched_at for latest since timeframe filters on launched_at
  const dateRange = db.prepare(
    'SELECT MIN(created_at) AS earliest, MAX(launched_at) AS latest FROM deals'
  ).get();

  res.json({
    source: 'db',
    dataRange: { earliest: dateRange.earliest, latest: dateRange.latest },
    summary: {
      total,
      implementing: implementing.length,
      launchedInPeriod: launched.length,
    },
    sizeDistribution: bucketSizeDistribution(sizeRows),
    implementingSizeDistribution: bucketSizeDistribution(implementingSizeDist),
    implementing,
    launched,
  });
});

module.exports = router;
