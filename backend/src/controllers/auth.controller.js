const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/db');
const { signAccessToken, signRefreshToken, verifyRefreshToken, refreshTokenExpiresAt } = require('../utils/jwt');
const R = require('../utils/response');

// POST /api/auth/login
async function login(req, res) {
  try {
    const { username, password } = req.body;

    const [rows] = await pool.query(
      'SELECT * FROM users WHERE username = ? AND status = "active" LIMIT 1',
      [username.toLowerCase()]
    );

    if (!rows.length) return R.unauthorized(res, 'Invalid credentials');

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return R.unauthorized(res, 'Invalid credentials');

    const payload = { id: user.id, username: user.username, role: user.role };
    const accessToken  = signAccessToken(payload);
    const refreshToken = signRefreshToken({ id: user.id });

    // Persist refresh token
    await pool.query(
      'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
      [uuidv4(), user.id, refreshToken, refreshTokenExpiresAt()]
    );

    return R.success(res, {
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, username: user.username, role: user.role, email: user.email },
    }, 'Login successful');
  } catch (err) {
    return R.serverError(res, err);
  }
}

// POST /api/auth/refresh
async function refresh(req, res) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return R.badRequest(res, 'Refresh token required');

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      return R.unauthorized(res, 'Invalid or expired refresh token');
    }

    const [rows] = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token = ? AND revoked = 0 AND expires_at > NOW() LIMIT 1',
      [refreshToken]
    );

    if (!rows.length) return R.unauthorized(res, 'Refresh token revoked or expired');

    const [users] = await pool.query('SELECT * FROM users WHERE id = ? AND status = "active" LIMIT 1', [decoded.id]);
    if (!users.length) return R.unauthorized(res, 'User not found');

    const user = users[0];
    const payload = { id: user.id, username: user.username, role: user.role };
    const newAccessToken  = signAccessToken(payload);
    const newRefreshToken = signRefreshToken({ id: user.id });

    // Rotate: revoke old, insert new
    await pool.query('UPDATE refresh_tokens SET revoked = 1 WHERE token = ?', [refreshToken]);
    await pool.query(
      'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
      [uuidv4(), user.id, newRefreshToken, refreshTokenExpiresAt()]
    );

    return R.success(res, { accessToken: newAccessToken, refreshToken: newRefreshToken }, 'Token refreshed');
  } catch (err) {
    return R.serverError(res, err);
  }
}

// POST /api/auth/logout
async function logout(req, res) {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await pool.query('UPDATE refresh_tokens SET revoked = 1 WHERE token = ?', [refreshToken]);
    }
    return R.success(res, {}, 'Logged out');
  } catch (err) {
    return R.serverError(res, err);
  }
}

// GET /api/auth/me
async function me(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, username, role, email, phone, department, status, created_at FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    );
    if (!rows.length) return R.notFound(res, 'User not found');
    return R.success(res, rows[0]);
  } catch (err) {
    return R.serverError(res, err);
  }
}

module.exports = { login, refresh, logout, me };