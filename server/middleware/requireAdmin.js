function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required. Your account has read-only access.' });
  }
  next();
}

module.exports = requireAdmin;
