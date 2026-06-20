require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { testConnection } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ────────────────────────────────────────────────────────────
/**
 * GET /api/health
 * Verifies the server is running and the MySQL pool is reachable.
 */
app.get('/api/health', async (req, res) => {
  try {
    await testConnection();
    res.status(200).json({
      status: 'ok',
      message: 'Odoo Cafe POS API is running',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ─── Routes ──────────────────────────────────────────────────────────────────
// Central API router — orders, KDS, and sync endpoints
app.use('/api', require('./routes/api'));

// Future route mounts (uncomment as features are implemented):
// app.use('/api/customers',   require('./routes/customers'));
// app.use('/api/employees',   require('./routes/employees'));
// app.use('/api/payments',    require('./routes/payments'));
// app.use('/api/tables',      require('./routes/tables'));
// app.use('/api/coupons',     require('./routes/coupons'));
// app.use('/api/reports',     require('./routes/reports'));

// ─── 404 Handler ────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: `Route ${req.originalUrl} not found` });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
  });
});

// ─── Start Server ────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`🚀 Odoo Cafe POS backend listening on http://localhost:${PORT}`);
  try {
    await testConnection();
  } catch {
    console.warn('⚠️  Server started but database is not connected. Check your .env settings.');
  }
});

module.exports = app;
