const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser(config.jwtSecretKey || 'dev-cookie-secret'));

const dbPath = path.resolve(__dirname, config.dbPath);
const sessionsDbPath = path.join(path.dirname(dbPath), 'sessions.db');

// --- Google SSO auth (if configured) ---
if (config.jwtSecretKey && process.env.GOOGLE_CLIENT_ID) {
  const jwt = require('jsonwebtoken');
  const { initSaviAuth } = require('@savi/express-auth');
  const { verifyJwt, validateSession } = require('@savi/express-auth/lib/session-store');
  const { checkAccess } = require('@savi/express-auth/lib/access-control');
  const db = require('./db');
  const { verifyPassword } = require('./routes/users');

  function validateUser(token) {
    const payload = verifyJwt(token, config.jwtSecretKey);
    if (payload.local) {
      const user = db.prepare(`SELECT id, name, email FROM local_users WHERE LOWER(email) = LOWER(?)`).get(payload.email);
      if (!user) throw new Error('User not found');
      return { email: user.email, name: user.name, picture: null, role: 'admin', session_id: null };
    }
    try {
      return validateSession(payload.session_id, 'hubspot-dashboard', {
        configPath: config.saviAuthConfigPath || undefined,
        dbPath: sessionsDbPath,
      });
    } catch (err) {
      if (err.reason !== 'session_not_found') throw err;
      const access = checkAccess(payload.email, 'hubspot-dashboard', config.saviAuthConfigPath || undefined);
      if (!access.allowed) throw err;
      return {
        email: payload.email,
        name: payload.name || payload.email,
        picture: null,
        role: access.role,
        session_id: payload.session_id,
      };
    }
  }

  app.post('/auth/local/login', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
    const user = db.prepare(`SELECT * FROM local_users WHERE LOWER(email) = LOWER(?)`).get(email.trim());
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign(
      { email: user.email, name: user.name, local: true, role: user.role || 'support' },
      config.jwtSecretKey,
      { algorithm: 'HS256', expiresIn: '720h' }
    );
    res.cookie('savi_auth_token', token, {
      httpOnly: true, sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 720 * 60 * 60 * 1000,
    });
    res.json({ ok: true, email: user.email, name: user.name });
  });

  initSaviAuth(app, 'hubspot-dashboard', {
    configPath: config.saviAuthConfigPath || undefined,
    jwtSecret: config.jwtSecretKey,
    dbPath: sessionsDbPath,
  });

  app.get('/auth/me', (req, res) => {
    const token = req.cookies && req.cookies.savi_auth_token;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });
    try {
      res.json(validateUser(token));
    } catch (err) {
      res.status(401).json({ error: 'Not authenticated' });
    }
  });

  app.use('/api', (req, res, next) => {
    const token = req.cookies && req.cookies.savi_auth_token;
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    try {
      req.user = validateUser(token);
      next();
    } catch (_) {
      res.status(401).json({ error: 'Authentication required' });
    }
  });
} else {
  app.get('/auth/me', (req, res) => {
    res.json({ email: 'anonymous', name: 'Anonymous', picture: null, role: 'admin', session_id: null });
  });
  app.post('/auth/local/login', (req, res) => res.status(503).json({ error: 'Auth not configured' }));
  console.log('Auth not configured (missing JWT_SECRET_KEY or GOOGLE_CLIENT_ID). Running without authentication.');
}

app.use('/api/settings', require('./routes/settings'));
app.use('/api/hubspot', require('./routes/hubspot'));
app.use('/api/sync', require('./routes/sync'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/renewals', require('./routes/renewals'));
app.use('/api/snapshots', require('./routes/snapshots'));
app.use('/api/analysis', require('./routes/analysis'));
app.use('/api/webinar', require('./routes/webinar'));
app.use('/api/users', require('./routes/users'));

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
