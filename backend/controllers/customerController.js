const { pool } = require('../config/db');

const getAllCustomers = async (req, res) => {
  try {
    const { q } = req.query;
    let query = 'SELECT * FROM customers';
    let params = [];

    if (q) {
      query += ' WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?';
      const searchPattern = `%${q}%`;
      params = [searchPattern, searchPattern, searchPattern];
    }
    
    query += ' ORDER BY name ASC';
    const [rows] = await pool.query(query, params);
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Get customers error:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve customers' });
  }
};

const createCustomer = async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Customer name is required' });
    }
    const [result] = await pool.query(
      'INSERT INTO customers (name, email, phone) VALUES (?, ?, ?)',
      [name, email || null, phone || null]
    );
    return res.status(201).json({
      success: true,
      data: { id: result.insertId, name, email, phone }
    });
  } catch (error) {
    console.error('Create customer error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create customer' });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone } = req.body;

    const [existing] = await pool.query('SELECT * FROM customers WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    const current = existing[0];

    const uName = name !== undefined ? name : current.name;
    const uEmail = email !== undefined ? email : current.email;
    const uPhone = phone !== undefined ? phone : current.phone;

    await pool.query(
      'UPDATE customers SET name = ?, email = ?, phone = ? WHERE id = ?',
      [uName, uEmail, uPhone, id]
    );

    return res.status(200).json({
      success: true,
      data: { id, name: uName, email: uEmail, phone: uPhone }
    });
  } catch (error) {
    console.error('Update customer error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update customer' });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM customers WHERE id = ?', [id]);
    return res.status(200).json({ success: true, data: { message: 'Customer deleted successfully' } });
  } catch (error) {
    console.error('Delete customer error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete customer' });
  }
};

module.exports = {
  getAllCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer
};
