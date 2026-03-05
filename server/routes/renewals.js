const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const db = require('../db');

const SNAPSHOT_PATH = path.resolve(__dirname, '../data/snapshots.json');

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key=?').get(key);
  return row ? row.value : null;
}

function getLatestSnapshot() {
  if (!fs.existsSync(SNAPSHOT_PATH)) return null;
  const snapshots = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf-8'));
  if (!Array.isArray(snapshots) || snapshots.length === 0) return null;
  return snapshots[snapshots.length - 1];
}

router.get('/', (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) {
    return res.status(400).json({ error: 'from and to query parameters are required' });
  }

  const { total } = db.prepare('SELECT COUNT(*) AS total FROM deals').get();

  // Fall back to snapshot renewal data when DB is empty
  if (total === 0) {
    const snapshot = getLatestSnapshot();
    if (snapshot && snapshot.metrics && snapshot.metrics.renewal_deals) {
      const filtered = snapshot.metrics.renewal_deals.filter(
        (d) => d.contract_end_date >= from && d.contract_end_date <= to
      );
      return res.json({ source: 'snapshot', deals: filtered });
    }
    return res.json({ source: 'snapshot', deals: [] });
  }

  const contractEndProperty = getSetting('contract_end_property') || '';
  if (!contractEndProperty) {
    return res.json([]);
  }

  const deals = db
    .prepare(
      `SELECT id, name, stage_id, pipeline, contract_start_date, contract_end_date, contract_renewal_date
       FROM deals
       WHERE contract_end_date IS NOT NULL
         AND contract_end_date >= ?
         AND contract_end_date <= ?
       ORDER BY contract_end_date ASC`
    )
    .all(from, to);

  res.json(deals);
});

module.exports = router;
