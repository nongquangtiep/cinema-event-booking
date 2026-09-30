/**
 * Database Connection Pool Configuration
 * Uses mysql2/promise with connection pooling and environment variables
 */

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'mysql',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'cinema_user',
  password: process.env.DB_PASS || 'cinema_secret_password',
  database: process.env.DB_NAME || 'cinema_db',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});

/**
 * Helper to test database connectivity
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch (err) {
    return false;
  }
}

module.exports = {
  pool,
  testConnection
};
