const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'odoo_cafe_pos_secret_key';

/**
 * Middleware to verify JWT token.
 * Extracts "Bearer <token>" from Authorization header, verifies it,
 * and attaches decoded payload { id, name, role } to req.user.
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ success: false, error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, error: 'Access denied. Malformed token.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('JWT verification error:', error.message);
    return res.status(401).json({ success: false, error: 'Invalid or expired token.' });
  }
};

/**
 * Middleware to restrict access to admin users only.
 * Must be used after verifyToken middleware.
 */
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Access denied. Admin role required.' });
  }
  next();
};

module.exports = {
  verifyToken,
  isAdmin
};
