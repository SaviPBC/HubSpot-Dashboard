const db = require('../db');
const { fetchAllDeals, searchDealsSince } = require('./hubspotClient');
const { saveSnapshot } = require('./snapshotService');

let currentSync = {
  status: 'idle',
  progress: 0,
  total: 0,
  phase: '',
  error: null,
  startedAt: null,
};

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key=?').get(key);
  return row ? row.value : null;
}

function getStatus() {
  return { ...currentSync };
}

function getLastSyncTime() {
  const row = db.prepare(
    "SELECT completed_at FROM sync_runs WHERE status='completed' ORDER BY id DESC LIMIT 1"
  ).get();
  return row ? row.completed_at : null;
}

async function startSync({ full = false } = {}) {
  if (currentSync.status === 'running') {
    throw Object.assign(new Error('Sync already in progress'), { status: 400 });
  }

  const token = getSetting('hubspot_api_token');
  if (!token) throw Object.assign(new Error('HubSpot API token not configured'), { status: 400 });

  const sizeProperty = getSetting('size_property') || '';
  const networkProperty = getSetting('network_property') || '';
  const launchedIds = JSON.parse(getSetting('launched_stage_ids') || '[]');
  const contractStartProperty = getSetting('contract_start_property') || '';
  const contractEndProperty = getSetting('contract_end_property') || '';
  const contractRenewalProperty = getSetting('contract_renewal_property') || '';
  const launchDateProperty = getSetting('launch_date_property') || '';

  // Build the property list to request
  const properties = [
    'dealname',
    'dealstage',
    'pipeline',
    'createdate',
    'closedate',
    'hs_lastmodifieddate',
  ];
  if (sizeProperty) properties.push(sizeProperty);
  if (networkProperty) properties.push(networkProperty);
  if (contractStartProperty) properties.push(contractStartProperty);
  if (contractEndProperty) properties.push(contractEndProperty);
  if (contractRenewalProperty) properties.push(contractRenewalProperty);
  if (launchDateProperty) properties.push(launchDateProperty);

  // Start run record
  const run = db
    .prepare(
      'INSERT INTO sync_runs (started_at, status) VALUES (?, ?) RETURNING id'
    )
    .get(new Date().toISOString(), 'running');
  const runId = run.id;

  currentSync = {
    status: 'running',
    progress: 0,
    total: 0,
    phase: 'Fetching deals from HubSpot',
    error: null,
    startedAt: new Date().toISOString(),
  };

  const lastSync = full ? null : getLastSyncTime();

  // Run async without blocking the response
  runSync(runId, token, properties, sizeProperty, networkProperty, launchedIds, contractStartProperty, contractEndProperty, contractRenewalProperty, launchDateProperty, lastSync).catch((err) => {
    console.error('Sync failed:', err.message);
    currentSync.status = 'failed';
    currentSync.error = err.message;
    db.prepare('UPDATE sync_runs SET status=?, completed_at=?, error=? WHERE id=?').run(
      'failed',
      new Date().toISOString(),
      err.message,
      runId
    );
  });

  return { runId };
}

async function runSync(runId, token, properties, sizeProperty, networkProperty, launchedIds, contractStartProperty, contractEndProperty, contractRenewalProperty, launchDateProperty, lastSync) {
  let deals;
  let syncMode = 'full';

  if (lastSync) {
    // Try incremental sync — fetch only deals modified since last sync
    const sinceMs = new Date(lastSync).getTime();
    currentSync.phase = 'Fetching modified deals from HubSpot';
    const result = await searchDealsSince(token, properties, sinceMs);

    if (result.capped) {
      // Over 10k changes — fall back to full sync
      console.log(`Incremental sync found ${result.total} changes (>10k cap), falling back to full sync`);
      currentSync.phase = 'Too many changes, running full sync';
      deals = await fetchAllDeals(token, properties);
    } else {
      deals = result.deals;
      syncMode = 'incremental';
      console.log(`Incremental sync: ${deals.length} deals modified since ${lastSync}`);
    }
  } else {
    deals = await fetchAllDeals(token, properties);
  }

  currentSync.total = deals.length;
  currentSync.phase = `Saving ${deals.length} deals`;

  const upsert = db.prepare(`
    INSERT INTO deals (id, name, pipeline, stage_id, size_value, network_value, created_at, close_date, launched_at, contract_start_date, contract_end_date, contract_renewal_date, synced_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name,
      pipeline=excluded.pipeline,
      stage_id=excluded.stage_id,
      size_value=excluded.size_value,
      network_value=excluded.network_value,
      created_at=excluded.created_at,
      close_date=excluded.close_date,
      launched_at=excluded.launched_at,
      contract_start_date=excluded.contract_start_date,
      contract_end_date=excluded.contract_end_date,
      contract_renewal_date=excluded.contract_renewal_date,
      synced_at=excluded.synced_at
  `);

  const saveBatch = db.transaction((batch) => {
    for (const deal of batch) {
      const props = deal.properties || {};
      const name = props.dealname || '(Unnamed)';
      const pipeline = props.pipeline || null;
      const stageId = props.dealstage || null;
      const sizeValue = sizeProperty ? (props[sizeProperty] || null) : null;
      const networkValue = networkProperty ? (props[networkProperty] || null) : null;
      const createdAt = props.createdate || null;
      const closeDate = props.closedate || null;
      const contractStartDate = contractStartProperty ? (props[contractStartProperty] || null) : null;
      const contractEndDate = contractEndProperty ? (props[contractEndProperty] || null) : null;
      const contractRenewalDate = contractRenewalProperty ? (props[contractRenewalProperty] || null) : null;
      const launchedAt = launchDateProperty ? (props[launchDateProperty] || null) : null;
      const now = new Date().toISOString();

      upsert.run(deal.id, name, pipeline, stageId, sizeValue, networkValue, createdAt, closeDate, launchedAt, contractStartDate, contractEndDate, contractRenewalDate, now);
    }
  });

  // Process in chunks to update progress
  const CHUNK = 200;
  for (let i = 0; i < deals.length; i += CHUNK) {
    saveBatch(deals.slice(i, i + CHUNK));
    currentSync.progress = Math.min(i + CHUNK, deals.length);
  }

  db.prepare(
    'UPDATE sync_runs SET status=?, completed_at=?, deals_fetched=? WHERE id=?'
  ).run('completed', new Date().toISOString(), deals.length, runId);

  // Save metrics snapshot for version control
  saveSnapshot(runId, deals.length);

  currentSync.status = 'completed';
  currentSync.progress = deals.length;
  currentSync.phase = syncMode === 'incremental'
    ? `Done (incremental: ${deals.length} updated)`
    : `Done (full: ${deals.length} deals)`;
}

module.exports = { startSync, getStatus };
