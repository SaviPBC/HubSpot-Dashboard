const router = require('express').Router();
const db = require('../db');
const axios = require('axios');
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

// Diagnostic: fetch a single deal from HubSpot with all its properties
router.get('/deal/:id', async (req, res, next) => {
  try {
    const token = getToken();
    if (!token) return res.status(400).json({ error: 'No API token configured' });
    const response = await axios.get(
      `https://api.hubapi.com/crm/v3/objects/deals/${req.params.id}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { properties: 'dealname,dealstage,pipeline,closedate,createdate,launch_date,go_live_date,go_live,launch_date_property' },
      }
    );
    // Also fetch with ALL properties so user can see everything
    const allPropsResponse = await axios.get(
      `https://api.hubapi.com/crm/v3/objects/deals/${req.params.id}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { propertiesWithHistory: false },
      }
    );
    const allProps = allPropsResponse.data.properties;
    // Filter to non-null values and date-looking fields
    const nonNull = Object.entries(allProps)
      .filter(([, v]) => v !== null && v !== '')
      .reduce((acc, [k, v]) => { acc[k] = v; return acc; }, {});
    res.json({ id: req.params.id, properties: nonNull });
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
