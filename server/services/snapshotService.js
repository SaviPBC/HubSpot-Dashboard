const db = require('../db');
const fs = require('fs');
const path = require('path');

const SNAPSHOT_PATH = path.resolve(__dirname, '../data/snapshots.json');

function getSetting(key) {
    const row = db.prepare('SELECT value FROM settings WHERE key=?').get(key);
    return row ? row.value : null;
}

function computeMetrics() {
    const implementingIds = JSON.parse(getSetting('implementing_stage_ids') || '[]');

    const { total } = db.prepare('SELECT COUNT(*) AS total FROM deals').get();

    // Implementing count
    let implementing = 0;
    let implementingDeals = [];
    if (implementingIds.length > 0) {
        const placeholders = implementingIds.map(() => '?').join(',');
        const row = db.prepare(
            `SELECT COUNT(*) AS cnt FROM deals WHERE stage_id IN (${placeholders})`
        ).get(implementingIds);
        implementing = row.cnt;

        // Anonymized implementing rows (no name, no network)
        implementingDeals = db.prepare(
            `SELECT size_value, stage_id, created_at, launched_at
             FROM deals WHERE stage_id IN (${placeholders})
             ORDER BY created_at DESC`
        ).all(implementingIds);
    }

    // Total ever launched (period-independent)
    const { cnt: totalEverLaunched } = db.prepare(
        'SELECT COUNT(*) AS cnt FROM deals WHERE launched_at IS NOT NULL'
    ).get();

    // Launched metrics: count by month and count by size (no PII)
    const launchedByMonth = db.prepare(
        `SELECT substr(launched_at, 1, 7) AS month, COUNT(*) AS count
         FROM deals WHERE launched_at IS NOT NULL
         GROUP BY month ORDER BY month`
    ).all();

    const launchedBySize = db.prepare(
        `SELECT COALESCE(size_value, 'Unknown') AS size, COUNT(*) AS count
         FROM deals WHERE launched_at IS NOT NULL
         GROUP BY size ORDER BY count DESC`
    ).all();

    // Size distribution
    const sizeDistribution = db.prepare(
        `SELECT COALESCE(size_value, 'Unknown') AS size, COUNT(*) AS count
         FROM deals GROUP BY size ORDER BY count DESC`
    ).all();

    // Implementing size distribution
    let implementingSizeDistribution = [];
    if (implementingIds.length > 0) {
        const placeholders = implementingIds.map(() => '?').join(',');
        implementingSizeDistribution = db.prepare(
            `SELECT COALESCE(size_value, 'Unknown') AS size, COUNT(*) AS count
             FROM deals WHERE stage_id IN (${placeholders})
             GROUP BY size ORDER BY count DESC`
        ).all(implementingIds);
    }

    // Anonymized renewal rows (no name, no network)
    const renewalDeals = db.prepare(
        `SELECT stage_id, contract_start_date, contract_end_date, contract_renewal_date
         FROM deals WHERE contract_end_date IS NOT NULL
         ORDER BY contract_end_date ASC`
    ).all();

    // Date range of all deals in DB
    const dateRange = db.prepare(
        `SELECT MIN(created_at) AS earliest, MAX(created_at) AS latest FROM deals`
    ).get();

    return {
        total,
        implementing,
        total_ever_launched: totalEverLaunched,
        size_distribution: sizeDistribution,
        implementing_size_distribution: implementingSizeDistribution,
        implementing_deals: implementingDeals,
        launched_by_month: launchedByMonth,
        launched_by_size: launchedBySize,
        renewal_deals: renewalDeals,
        date_range: {
            earliest: dateRange.earliest || null,
            latest: dateRange.latest || null,
        },
    };
}

function saveSnapshot(syncRunId, dealsFetched) {
    let snapshots = [];
    if (fs.existsSync(SNAPSHOT_PATH)) {
        const raw = fs.readFileSync(SNAPSHOT_PATH, 'utf-8');
        snapshots = JSON.parse(raw);
    }

    const snapshot = {
        timestamp: new Date().toISOString(),
        sync_run_id: syncRunId,
        deals_fetched: dealsFetched,
        metrics: computeMetrics(),
    };

    snapshots.push(snapshot);
    fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshots, null, 2), 'utf-8');
    console.log(`Snapshot saved (${snapshots.length} total)`);
}

module.exports = { saveSnapshot, computeMetrics };
