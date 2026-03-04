const router = require('express').Router();
const db = require('../db');

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key=?').get(key);
  return row ? row.value : null;
}

router.get('/', (req, res) => {
  const contractEndProperty = getSetting('contract_end_property') || '';
  if (!contractEndProperty) {
    return res.json([]);
  }

  const { from, to } = req.query;
  if (!from || !to) {
    return res.status(400).json({ error: 'from and to query parameters are required' });
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
