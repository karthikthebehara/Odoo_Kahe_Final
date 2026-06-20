const { pool } = require('../config/db');

const getAllPaymentMethods = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM payment_methods ORDER BY name ASC');
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Get payment methods error:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve payment methods' });
  }
};

const createPaymentMethod = async (req, res) => {
  try {
    const { name, type, is_enabled, upi_id } = req.body;
    if (!name || !type) {
      return res.status(400).json({ success: false, error: 'Name and Type are required' });
    }
    const [result] = await pool.query(
      'INSERT INTO payment_methods (name, type, is_enabled, upi_id) VALUES (?, ?, ?, ?)',
      [name, type, is_enabled !== undefined ? is_enabled : true, upi_id || null]
    );
    return res.status(201).json({
      success: true,
      data: { id: result.insertId, name, type, is_enabled: is_enabled !== undefined ? is_enabled : true, upi_id }
    });
  } catch (error) {
    console.error('Create payment method error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create payment method' });
  }
};

const updatePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, is_enabled, upi_id } = req.body;

    const [existing] = await pool.query('SELECT * FROM payment_methods WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Payment method not found' });
    }
    const current = existing[0];

    const uName = name !== undefined ? name : current.name;
    const uType = type !== undefined ? type : current.type;
    const uEnabled = is_enabled !== undefined ? is_enabled : current.is_enabled;
    const uUpi = upi_id !== undefined ? upi_id : current.upi_id;

    await pool.query(
      'UPDATE payment_methods SET name = ?, type = ?, is_enabled = ?, upi_id = ? WHERE id = ?',
      [uName, uType, uEnabled, uUpi, id]
    );

    return res.status(200).json({
      success: true,
      data: { id, name: uName, type: uType, is_enabled: uEnabled, upi_id: uUpi }
    });
  } catch (error) {
    console.error('Update payment method error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update payment method' });
  }
};

const deletePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM payment_methods WHERE id = ?', [id]);
    return res.status(200).json({ success: true, data: { message: 'Payment method deleted successfully' } });
  } catch (error) {
    console.error('Delete payment method error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete payment method' });
  }
};

module.exports = {
  getAllPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod
};
