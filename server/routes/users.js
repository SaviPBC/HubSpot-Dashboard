const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const test = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(test), Buffer.from(hash));
}

// GET /api/users
router.get('/', (req, res, next) => {
  try {
    const users = db.prepare(`SELECT id, name, email, role, created_at, created_by FROM local_users ORDER BY created_at DESC`).all();
    res.json(users);
  } catch (err) { next(err); }
});

// POST /api/users — create a new local user (admin only)
router.post('/', requireAdmin, (req, res, next) => {
  try {
    const { name, email, password, role = 'support' } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email, and password are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    if (!['admin', 'support'].includes(role)) return res.status(400).json({ error: 'role must be admin or support' });

    const existing = db.prepare(`SELECT id FROM local_users WHERE LOWER(email) = LOWER(?)`).get(email);
    if (existing) return res.status(409).json({ error: 'A user with that email already exists' });

    const hash = hashPassword(password);
    const result = db.prepare(`INSERT INTO local_users (name, email, password_hash, role, created_by) VALUES (?, ?, ?, ?, ?)`).run(
      name.trim(), email.trim().toLowerCase(), hash, role, req.user?.email || 'admin'
    );

    res.json({ id: result.lastInsertRowid, name: name.trim(), email: email.trim().toLowerCase(), role });
  } catch (err) { next(err); }
});

// PATCH /api/users/:id/role — change role (admin only)
router.patch('/:id/role', requireAdmin, (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['admin', 'support'].includes(role)) return res.status(400).json({ error: 'role must be admin or support' });
    const user = db.prepare(`SELECT id, email FROM local_users WHERE id = ?`).get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    db.prepare(`UPDATE local_users SET role = ? WHERE id = ?`).run(role, user.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// PATCH /api/users/:id/password — change password (admin only)
router.patch('/:id/password', requireAdmin, (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const user = db.prepare(`SELECT id, email FROM local_users WHERE id = ?`).get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    db.prepare(`UPDATE local_users SET password_hash = ? WHERE id = ?`).run(hashPassword(password), user.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /api/users/:id (admin only)
router.delete('/:id', requireAdmin, (req, res, next) => {
  try {
    const user = db.prepare(`SELECT id, email FROM local_users WHERE id = ?`).get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    db.prepare(`DELETE FROM local_users WHERE id = ?`).run(user.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
module.exports.hashPassword = hashPassword;
module.exports.verifyPassword = verifyPassword;
