function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.isAdmin) return next();
  res.status(403).json({ error: 'Forbidden' });
}

function attachUserIfAny(req, _res, next) {
  // no-op placeholder for future expansions
  next();
}

module.exports = { requireAuth, requireAdmin, attachUserIfAny };



