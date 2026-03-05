const express = require('express');
const cors = require('cors');
const config = require('./config');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/settings', require('./routes/settings'));
app.use('/api/hubspot', require('./routes/hubspot'));
app.use('/api/sync', require('./routes/sync'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/renewals', require('./routes/renewals'));
app.use('/api/snapshots', require('./routes/snapshots'));

app.use(errorHandler);

// Auto-refresh snapshot if DB has data but snapshot is missing new fields
function checkSnapshotFreshness() {
  try {
    const db = require('./db');
    const fs = require('fs');
    const path = require('path');
    const { saveSnapshot, computeMetrics } = require('./services/snapshotService');

    const { total } = db.prepare('SELECT COUNT(*) AS total FROM deals').get();
    if (total === 0) return;

    const snapshotPath = path.resolve(__dirname, 'data/snapshots.json');
    let snapshots = [];
    if (fs.existsSync(snapshotPath)) {
      snapshots = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
    }

    const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
    const needsRefresh = !latest
      || !latest.metrics.launched_by_month
      || !latest.metrics.implementing_deals
      || !latest.metrics.renewal_deals
      || !latest.metrics.date_range;

    if (needsRefresh) {
      console.log('Snapshot missing new fields — regenerating from local DB...');
      saveSnapshot(latest?.sync_run_id || 0, total);
      console.log('Snapshot updated.');
    }
  } catch (err) {
    console.error('Snapshot freshness check failed:', err.message);
  }
}

app.listen(config.port, () => {
  console.log(`HubSpot Dashboard server running on http://localhost:${config.port}`);
  checkSnapshotFreshness();
});
