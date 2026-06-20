const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

const getAllEmployees = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, email, role, is_archived, created_at FROM users ORDER BY name ASC');
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Get employees error:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve employees' });
  }
};

const createEmployee = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required' });
    }

    // Check for duplicate email
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: 'A user with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const userRole = role || 'employee';

    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, role, is_archived) VALUES (?, ?, ?, ?, FALSE)',
      [name, email, hashedPassword, userRole]
    );

    return res.status(201).json({
      success: true,
      data: { id: result.insertId, name, email, role: userRole, is_archived: false }
    });
  } catch (error) {
    console.error('Create employee error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create employee' });
  }
};

const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, is_archived } = req.body;

    const [existing] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const current = existing[0];

    const uName = name !== undefined ? name : current.name;
    const uEmail = email !== undefined ? email : current.email;
    const uRole = role !== undefined ? role : current.role;
    const uArchived = is_archived !== undefined ? is_archived : current.is_archived;

    let query = 'UPDATE users SET name = ?, email = ?, role = ?, is_archived = ?';
    let params = [uName, uEmail, uRole, uArchived];

    if (password && password.trim().length > 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      query += ', password = ?';
      params.push(hashedPassword);
    }

    query += ' WHERE id = ?';
    params.push(id);

    await pool.query(query, params);

    return res.status(200).json({
      success: true,
      data: { id, name: uName, email: uEmail, role: uRole, is_archived: uArchived }
    });
  } catch (error) {
    console.error('Update employee error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update employee' });
  }
};

const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    return res.status(200).json({ success: true, data: { message: 'User deleted successfully' } });
  } catch (error) {
    console.error('Delete employee error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
};

module.exports = {
  getAllEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee
};
