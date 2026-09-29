/**
 * Database Connection Pool Configuration
 * Phase 1: Skeleton configuration
 */

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'mysql',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'cinema_user',
  password: process.env.DB_PASS || 'cinema_secret_password',
  database: process.env.DB_NAME || 'cinema_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
