const router = require('express').Router();
const db = require('../db');

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key=?').get(key);
  return row ? row.value : null;
}

router.get('/', (req, res) => {
  const { from, to } = req.query;

  const implementingIds = JSON.parse(getSetting('implementing_stage_ids') || '[]');
  const launchedIds = JSON.parse(getSetting('launched_stage_ids') || '[]');

  // Total deals in DB
  const { total } = db.prepare('SELECT COUNT(*) AS total FROM deals').get();

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

  res.json({
    summary: {
      total,
      implementing: implementing.length,
      launchedInPeriod: launched.length,
    },
    sizeDistribution: sizeRows,
    implementingSizeDistribution: implementingSizeDist,
    implementing,
    launched,
  });
});

module.exports = router;
