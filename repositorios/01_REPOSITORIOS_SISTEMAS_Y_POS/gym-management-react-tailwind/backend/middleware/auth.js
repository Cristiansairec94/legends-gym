const { verifyToken } = require('../utils/token');
const { fail } = require('../utils/response');

/** Require a valid JWT. Attaches req.user = { id, role, name }. */
const authenticate = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return fail(res, 'Authentication required', 401);
  try {
    req.user = verifyToken(token);
    return next();
  } catch (err) {
    return fail(res, 'Invalid or expired token', 401);
  }
};

/** Require the authenticated user to have one of the given roles. */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return fail(res, 'Authentication required', 401);
  if (!roles.includes(req.user.role)) return fail(res, 'Access denied', 403);
  return next();
};

const requireAdmin = [authenticate, authorize('admin')];

module.exports = { authenticate, authorize, requireAdmin };
