/**
 * Authentication Controller
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const logger = require('../config/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const SALT_ROUNDS = 10;

/**
 * Register new customer account
 * POST /api/auth/register
 */
async function register(req, res, next) {
  try {
    const { username, email, password, full_name, phone } = req.body;

    if (!username || !email || !password || !full_name) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ: username, email, password, full_name.' });
    }

    // Check if username or email already exists
    const [existing] = await pool.execute(
      'SELECT id, username, email FROM users WHERE username = ? OR email = ? LIMIT 1',
      [username, email]
    );

    if (existing.length > 0) {
      const field = existing[0].username === username ? 'Tên đăng nhập' : 'Email';
      return res.status(409).json({ error: `${field} đã được sử dụng. Vui lòng chọn giá trị khác.` });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert user
    const [result] = await pool.execute(
      'INSERT INTO users (username, email, password_hash, full_name, phone, role) VALUES (?, ?, ?, ?, ?, ?)',
      [username, email, password_hash, full_name, phone || null, 'user']
    );

    const userId = result.insertId;
    const token = jwt.sign(
      { id: userId, username, email, role: 'user', full_name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    logger.info('User registered successfully', { userId, username });

    res.status(201).json({
      message: 'Đăng ký tài khoản thành công',
      token,
      user: {
        id: userId,
        username,
        email,
        full_name,
        role: 'user'
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Login user/admin
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Vui lòng cung cấp tài khoản và mật khẩu.' });
    }

    // Find user by username or email
    const [rows] = await pool.execute(
      'SELECT id, username, email, password_hash, full_name, role FROM users WHERE username = ? OR email = ? LIMIT 1',
      [username, username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Tài khoản hoặc mật khẩu không chính xác.' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({ error: 'Tài khoản hoặc mật khẩu không chính xác.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role, full_name: user.full_name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    logger.info('User logged in', { userId: user.id, username: user.username, role: user.role });

    res.json({
      message: 'Đăng nhập thành công',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get current logged in user profile
 * GET /api/auth/me
 */
async function getMe(req, res, next) {
  try {
    const [rows] = await pool.execute(
      'SELECT id, username, email, full_name, phone, role, created_at FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Người dùng không tồn tại.' });
    }

    res.json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  getMe
};
