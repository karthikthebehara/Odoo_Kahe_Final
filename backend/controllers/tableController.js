const { pool } = require('../config/db');

// ─── FLOORS ──────────────────────────────────────────────────────────────────

const getAllFloors = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM floors ORDER BY name ASC');
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Get floors error:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve floors' });
  }
};

const createFloor = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Floor name is required' });
    }
    const [result] = await pool.query('INSERT INTO floors (name) VALUES (?)', [name]);
    return res.status(201).json({ success: true, data: { id: result.insertId, name } });
  } catch (error) {
    console.error('Create floor error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create floor' });
  }
};

const deleteFloor = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM floors WHERE id = ?', [id]);
    return res.status(200).json({ success: true, data: { message: 'Floor deleted successfully' } });
  } catch (error) {
    console.error('Delete floor error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete floor' });
  }
};

// ─── TABLES ──────────────────────────────────────────────────────────────────

const getAllTables = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT t.*, f.name AS floor_name 
      FROM tables t
      JOIN floors f ON t.floor_id = f.id
      ORDER BY f.name ASC, t.table_number ASC
    `);
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Get tables error:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve tables' });
  }
};

const createTable = async (req, res) => {
  try {
    const { floor_id, table_number, seats, status, is_active } = req.body;
    if (!floor_id || !table_number) {
      return res.status(400).json({ success: false, error: 'Floor ID and Table Number are required' });
    }
    const qrToken = `token-floor-${floor_id}-${table_number.toLowerCase()}`;
    const [result] = await pool.query(
      'INSERT INTO tables (floor_id, table_number, seats, status, is_active, qr_token) VALUES (?, ?, ?, ?, ?, ?)',
      [floor_id, table_number, seats || 2, status || 'available', is_active !== undefined ? is_active : true, qrToken]
    );
    return res.status(201).json({
      success: true,
      data: { id: result.insertId, floor_id, table_number, seats, status, is_active, qr_token: qrToken }
    });
  } catch (error) {
    console.error('Create table error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create table' });
  }
};

const updateTable = async (req, res) => {
  try {
    const { id } = req.params;
    const { floor_id, table_number, seats, status, is_active } = req.body;
    
    const [existing] = await pool.query('SELECT * FROM tables WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Table not found' });
    }
    const current = existing[0];
    
    const fId = floor_id !== undefined ? floor_id : current.floor_id;
    const tNum = table_number !== undefined ? table_number : current.table_number;
    const sCount = seats !== undefined ? seats : current.seats;
    const tStatus = status !== undefined ? status : current.status;
    const active = is_active !== undefined ? is_active : current.is_active;
    
    await pool.query(
      'UPDATE tables SET floor_id = ?, table_number = ?, seats = ?, status = ?, is_active = ? WHERE id = ?',
      [fId, tNum, sCount, tStatus, active, id]
    );
    
    return res.status(200).json({
      success: true,
      data: { id, floor_id: fId, table_number: tNum, seats: sCount, status: tStatus, is_active: active }
    });
  } catch (error) {
    console.error('Update table error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update table' });
  }
};

const deleteTable = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM tables WHERE id = ?', [id]);
    return res.status(200).json({ success: true, data: { message: 'Table deleted successfully' } });
  } catch (error) {
    console.error('Delete table error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete table' });
  }
};

const verifyTableToken = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Table token is required' });
    }

    const [rows] = await pool.query(
      `SELECT t.*, f.name AS floor_name 
       FROM tables t
       JOIN floors f ON t.floor_id = f.id
       WHERE t.qr_token = ? LIMIT 1`,
      [token]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invalid or expired table token.' });
    }

    return res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Verify table token error:', error);
    return res.status(500).json({ success: false, error: 'Failed to verify table token' });
  }
};

module.exports = {
  getAllFloors,
  createFloor,
  deleteFloor,
  getAllTables,
  createTable,
  updateTable,
  deleteTable,
  verifyTableToken
};
