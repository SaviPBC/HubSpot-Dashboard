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
    if (implementingIds.length > 0) {
        const placeholders = implementingIds.map(() => '?').join(',');
        const row = db.prepare(
            `SELECT COUNT(*) AS cnt FROM deals WHERE stage_id IN (${placeholders})`
        ).get(implementingIds);
        implementing = row.cnt;
    }

    // Total ever launched (period-independent)
    const { cnt: totalEverLaunched } = db.prepare(
        'SELECT COUNT(*) AS cnt FROM deals WHERE launched_at IS NOT NULL'
    ).get();

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

    return {
        total,
        implementing,
        total_ever_launched: totalEverLaunched,
        size_distribution: sizeDistribution,
        implementing_size_distribution: implementingSizeDistribution,
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
