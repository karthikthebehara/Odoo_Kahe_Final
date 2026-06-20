const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * MySQL connection pool using mysql2/promise.
 * Reads configuration from environment variables defined in backend/.env
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'odoo_cafe_pos',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00',
});

/**
 * Test the database connection pool.
 * Called on server startup to verify MySQL is reachable.
 */
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL connection pool established successfully.');
    connection.release();
  } catch (error) {
    console.error('❌ Failed to connect to MySQL:', error.message);
    throw error;
  }
};

module.exports = { pool, testConnection };
