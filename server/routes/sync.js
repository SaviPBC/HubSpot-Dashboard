const router = require('express').Router();
const { startSync, getStatus } = require('../services/syncService');

router.post('/', async (req, res, next) => {
  try {
    const full = req.query.full === 'true';
    const result = await startSync({ full });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/status', (req, res) => {
  res.json(getStatus());
});

module.exports = router;
