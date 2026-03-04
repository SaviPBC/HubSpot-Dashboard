const router = require('express').Router();
const { startSync, getStatus } = require('../services/syncService');

router.post('/', async (req, res, next) => {
  try {
    const result = await startSync();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/status', (req, res) => {
  res.json(getStatus());
});

module.exports = router;
