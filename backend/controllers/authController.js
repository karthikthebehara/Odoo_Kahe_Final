const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'odoo_cafe_pos_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// ─── Signup ──────────────────────────────────────────────────────────────────
/**
 * POST /api/signup
 * Body: { name, email, password, role? }
 * Creates a new user with a hashed password.
 */
const signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // ── Validate required fields ──
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and password are required',
      });
    }

    // ── Validate role if provided ──
    const allowedRoles = ['admin', 'employee'];
    const userRole = role ? role.toLowerCase() : 'employee';

    if (!allowedRoles.includes(userRole)) {
      return res.status(400).json({
        success: false,
        error: `Invalid role. Allowed roles: ${allowedRoles.join(', ')}`,
      });
    }

    // ── Check for duplicate email ──
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'A user with this email already exists',
      });
    }

    // ── Hash password and insert ──
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, userRole]
    );

    return res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        name,
        email,
        role: userRole,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during signup',
    });
  }
};

// ─── Login ───────────────────────────────────────────────────────────────────
/**
 * POST /api/login
 * Body: { email, password }
 * Returns a signed JWT on successful authentication.
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ── Validate required fields ──
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    // ── Fetch user by email ──
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    const user = rows[0];

    // ── Block archived users ──
    if (user.is_archived === 1 || user.is_archived === true) {
      return res.status(403).json({
        success: false,
        error: 'This account has been archived. Please contact an administrator.',
      });
    }

    // ── Verify password ──
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // ── Sign JWT ──
    const payload = {
      id: user.id,
      name: user.name,
      role: user.role,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during login',
    });
  }
};

module.exports = { signup, login };
