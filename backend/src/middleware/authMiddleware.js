/**
 * Authentication & Authorization Middlewares
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

/**
 * Require valid JWT Bearer Token
 */
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Yêu cầu đăng nhập. Token không hợp lệ hoặc thiếu.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, username, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token đã hết hạn hoặc không hợp lệ.' });
  }
}

/**
 * Optional Authentication (attach user if token provided, but do not block)
 */
function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      // Ignore invalid token for optional auth
    }
  }
  next();
}

/**
 * Require Admin Role
 */
function authorizeAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Truy cập bị từ chối. Chỉ dành cho Quản trị viên (Admin).' });
  }
  next();
}

module.exports = {
  authenticate,
  optionalAuthenticate,
  authorizeAdmin
};
