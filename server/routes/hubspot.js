const router = require('express').Router();
const db = require('../db');
const { getProperties, getPipelines } = require('../services/hubspotClient');

function getToken() {
  const row = db.prepare("SELECT value FROM settings WHERE key='hubspot_api_token'").get();
  return row ? row.value : null;
}

router.get('/properties', async (req, res, next) => {
  try {
    const token = getToken();
    if (!token) return res.status(400).json({ error: 'No API token configured' });
    const properties = await getProperties(token);
    // Return sorted by label, filtered to useful types
    const sorted = properties
      .filter((p) => !p.name.startsWith('hs_') || ['hs_deal_stage_probability'].includes(p.name))
      .sort((a, b) => a.label.localeCompare(b.label));
    res.json(sorted);
  } catch (err) {
    next(err);
  }
});

router.get('/properties/all', async (req, res, next) => {
  try {
    const token = getToken();
    if (!token) return res.status(400).json({ error: 'No API token configured' });
    const properties = await getProperties(token);
    res.json(properties.sort((a, b) => a.label.localeCompare(b.label)));
  } catch (err) {
    next(err);
  }
});

router.get('/pipelines', async (req, res, next) => {
  try {
    const token = getToken();
    if (!token) return res.status(400).json({ error: 'No API token configured' });
    const pipelines = await getPipelines(token);
    res.json(pipelines);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
