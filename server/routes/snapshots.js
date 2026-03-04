const router = require('express').Router();
const fs = require('fs');
const path = require('path');

const SNAPSHOT_PATH = path.resolve(__dirname, '../data/snapshots.json');

router.get('/', (req, res) => {
    if (!fs.existsSync(SNAPSHOT_PATH)) {
        return res.json([]);
    }
    const raw = fs.readFileSync(SNAPSHOT_PATH, 'utf-8');
    res.json(JSON.parse(raw));
});

module.exports = router;
