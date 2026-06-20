const { pool } = require('../config/db');

/**
 * GET /api/sessions/active
 * Gets the active open session for the current user (if any).
 * Since auth middleware adds user to req.user: req.user.id
 */
const getActiveSession = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : req.query.user_id;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    const [rows] = await pool.query(
      "SELECT * FROM sessions WHERE user_id = ? AND status = 'open' LIMIT 1",
      [userId]
    );

    if (rows.length === 0) {
      return res.status(200).json({ success: true, data: null });
    }

    return res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Get active session error:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve active session' });
  }
};

/**
 * POST /api/sessions
 * Opens a new session.
 * Body: { opening_balance }
 */
const openSession = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : req.body.user_id;
    const { opening_balance } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    // Check if there is already an active session for this user
    const [existing] = await pool.query(
      "SELECT id FROM sessions WHERE user_id = ? AND status = 'open' LIMIT 1",
      [userId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: 'You already have an open session.' });
    }

    const [result] = await pool.query(
      "INSERT INTO sessions (user_id, status, opening_balance, start_time) VALUES (?, 'open', ?, NOW())",
      [userId, opening_balance || 0.00]
    );

    return res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        user_id: userId,
        status: 'open',
        opening_balance: opening_balance || 0.00,
      }
    });
  } catch (error) {
    console.error('Open session error:', error);
    return res.status(500).json({ success: false, error: 'Failed to open session' });
  }
};

/**
 * PUT /api/sessions/:id/close
 * Closes an active session.
 * Body: { closing_balance }
 */
const closeSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { closing_balance } = req.body;

    const [existing] = await pool.query('SELECT * FROM sessions WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const session = existing[0];
    if (session.status === 'closed') {
      return res.status(400).json({ success: false, error: 'Session is already closed' });
    }

    await pool.query(
      "UPDATE sessions SET status = 'closed', closing_balance = ?, end_time = NOW() WHERE id = ?",
      [closing_balance || 0.00, id]
    );

    return res.status(200).json({
      success: true,
      data: {
        id,
        status: 'closed',
        closing_balance: closing_balance || 0.00,
      }
    });
  } catch (error) {
    console.error('Close session error:', error);
    return res.status(500).json({ success: false, error: 'Failed to close session' });
  }
};

/**
 * GET /api/sessions/:id/summary
 * Computes a detailed summary of sales during the session.
 */
const getSessionSummary = async (req, res) => {
  try {
    const { id } = req.params;

    const [sessions] = await pool.query('SELECT * FROM sessions WHERE id = ?', [id]);
    if (sessions.length === 0) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    const session = sessions[0];

    // Compute sales totals by payment method during this session
    // Query paid orders
    const [salesRows] = await pool.query(
      `SELECT payment_method, SUM(total_amount) AS total 
       FROM orders 
       WHERE session_id = ? AND status = 'paid'
       GROUP BY payment_method`,
      [id]
    );

    let cashSales = 0;
    let cardSales = 0;
    let upiSales = 0;
    let totalSales = 0;

    salesRows.forEach(row => {
      const total = parseFloat(row.total || 0);
      totalSales += total;
      const method = (row.payment_method || '').toLowerCase();
      if (method.includes('cash')) {
        cashSales += total;
      } else if (method.includes('card')) {
        cardSales += total;
      } else if (method.includes('upi')) {
        upiSales += total;
      } else {
        // Default cash if undefined
        cashSales += total;
      }
    });

    const opening = parseFloat(session.opening_balance || 0);
    const expectedClosing = opening + cashSales; // Cash sales add to cash register expected amount

    return res.status(200).json({
      success: true,
      data: {
        session_id: id,
        opening_balance: opening,
        closing_balance: parseFloat(session.closing_balance || 0),
        cash_sales: cashSales,
        card_sales: cardSales,
        upi_sales: upiSales,
        total_sales: totalSales,
        expected_closing_cash: expectedClosing,
        difference: parseFloat(session.closing_balance || 0) - expectedClosing,
        status: session.status,
        start_time: session.start_time,
        end_time: session.end_time,
      }
    });
  } catch (error) {
    console.error('Session summary error:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve session summary' });
  }
};

/**
 * GET /api/sessions
 * Returns a list of all sessions.
 */
const getAllSessions = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM sessions ORDER BY start_time DESC');
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Get all sessions error:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve sessions' });
  }
};

module.exports = {
  getActiveSession,
  openSession,
  closeSession,
  getSessionSummary,
  getAllSessions
};
