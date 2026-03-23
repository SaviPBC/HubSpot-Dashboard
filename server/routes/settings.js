const router = require('express').Router();
const db = require('../db');
const { testConnection } = require('../services/hubspotClient');
const config = require('../config');

const MASK = '•';

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key=?').get(key);
  return row ? row.value : null;
}

function setSetting(key, value) {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value'
  ).run(key, value);
}

function maskToken(token) {
  if (!token || token.length <= 8) return token;
  return MASK.repeat(token.length - 4) + token.slice(-4);
}

// Bootstrap from env on startup (only if DB has no value)
(function bootstrap() {
  if (config.hubspotApiToken && !getSetting('hubspot_api_token')) {
    setSetting('hubspot_api_token', config.hubspotApiToken.trim());
  }
})();

router.get('/', (req, res) => {
  const token = getSetting('hubspot_api_token');
  const anthropicKey = getSetting('anthropic_api_key');
  const zoomSecret = getSetting('zoom_client_secret');
  const ebToken = getSetting('eventbrite_token');
  res.json({
    has_token: !!token,
    hubspot_api_token: token ? maskToken(token) : '',
    size_property: getSetting('size_property') || '',
    network_property: getSetting('network_property') || '',
    implementing_stage_ids: getSetting('implementing_stage_ids') || '[]',
    launched_stage_ids: getSetting('launched_stage_ids') || '[]',
    about_to_implement_stage_ids: getSetting('about_to_implement_stage_ids') || '[]',
    contract_start_property: getSetting('contract_start_property') || '',
    contract_end_property: getSetting('contract_end_property') || '',
    contract_renewal_property: getSetting('contract_renewal_property') || '',
    launch_date_property: getSetting('launch_date_property') || '',
    pricing_model_property: getSetting('pricing_model_property') || '',
    deal_source_property: getSetting('deal_source_property') || '',
    zoom_account_id: getSetting('zoom_account_id') || '',
    zoom_client_id: getSetting('zoom_client_id') || '',
    zoom_client_secret: zoomSecret ? maskToken(zoomSecret) : '',
    eventbrite_token: ebToken ? maskToken(ebToken) : '',
    eventbrite_org_id: getSetting('eventbrite_org_id') || '',
    anthropic_api_key: anthropicKey ? maskToken(anthropicKey) : '',
  });
});

router.put('/', (req, res) => {
  const { hubspot_api_token, size_property, network_property, implementing_stage_ids, launched_stage_ids, about_to_implement_stage_ids, contract_start_property, contract_end_property, contract_renewal_property, launch_date_property, pricing_model_property, deal_source_property, zoom_account_id, zoom_client_id, zoom_client_secret, eventbrite_token, eventbrite_org_id, anthropic_api_key } = req.body;

  // Only save token if it's not the masked version
  if (hubspot_api_token !== undefined && !hubspot_api_token.includes(MASK)) {
    setSetting('hubspot_api_token', hubspot_api_token.trim());
  }
  if (size_property !== undefined) setSetting('size_property', size_property);
  if (network_property !== undefined) setSetting('network_property', network_property);
  if (implementing_stage_ids !== undefined)
    setSetting('implementing_stage_ids', JSON.stringify(implementing_stage_ids));
  if (launched_stage_ids !== undefined)
    setSetting('launched_stage_ids', JSON.stringify(launched_stage_ids));
  if (about_to_implement_stage_ids !== undefined)
    setSetting('about_to_implement_stage_ids', JSON.stringify(about_to_implement_stage_ids));
  if (contract_start_property !== undefined) setSetting('contract_start_property', contract_start_property);
  if (contract_end_property !== undefined) setSetting('contract_end_property', contract_end_property);
  if (contract_renewal_property !== undefined) setSetting('contract_renewal_property', contract_renewal_property);
  if (launch_date_property !== undefined) setSetting('launch_date_property', launch_date_property);
  if (pricing_model_property !== undefined) setSetting('pricing_model_property', pricing_model_property);
  if (deal_source_property !== undefined) setSetting('deal_source_property', deal_source_property);

  if (zoom_account_id !== undefined) setSetting('zoom_account_id', zoom_account_id);
  if (zoom_client_id !== undefined) setSetting('zoom_client_id', zoom_client_id);
  if (zoom_client_secret !== undefined && !zoom_client_secret.includes(MASK)) setSetting('zoom_client_secret', zoom_client_secret);
  if (eventbrite_token !== undefined && !eventbrite_token.includes(MASK)) setSetting('eventbrite_token', eventbrite_token);
  if (eventbrite_org_id !== undefined) setSetting('eventbrite_org_id', eventbrite_org_id);
  if (anthropic_api_key !== undefined && !anthropic_api_key.includes(MASK)) setSetting('anthropic_api_key', anthropic_api_key);

  res.json({ ok: true });
});

router.post('/test', async (req, res) => {
  const token = req.body.token || getSetting('hubspot_api_token');
  if (!token) return res.status(400).json({ error: 'No API token configured' });
  try {
    await testConnection(token);
    res.json({ ok: true });
  } catch (err) {
    const status = err.response?.status || 500;
    const hubspotData = err.response?.data;
    const message = hubspotData?.message || err.message;
    console.error('HubSpot test connection failed:', status, hubspotData || err.message);
    res.status(status).json({ error: message, hubspot: hubspotData });
  }
});

module.exports = router;
