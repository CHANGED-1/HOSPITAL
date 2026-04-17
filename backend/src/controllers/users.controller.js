const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/db');
const R = require('../utils/response');

const SAFE_COLS = 'id, name, username, role, email, phone, department, status, created_at, updated_at';

// GET /api/users
async function list(req, res) {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const where = [];
    const params = [];

    if (role)   { where.push('role = ?');   params.push(role); }
    if (status) { where.push('status = ?'); params.push(status); }
    if (search) {
      where.push('(name LIKE ? OR username LIKE ? OR email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM users ${clause}`, params);
    const [rows] = await pool.query(
      `SELECT ${SAFE_COLS} FROM users ${clause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    return R.paginated(res, rows, total, page, limit);
  } catch (err) {
    return R.serverError(res, err);
  }
}

// GET /api/users/:id
async function getOne(req, res) {
  try {
    const [rows] = await pool.query(`SELECT ${SAFE_COLS} FROM users WHERE id = ? LIMIT 1`, [req.params.id]);
    if (!rows.length) return R.notFound(res, 'User not found');
    return R.success(res, rows[0]);
  } catch (err) {
    return R.serverError(res, err);
  }
}

// POST /api/users
async function create(req, res) {
  try {
    const { name, username, password, role, email, phone, department } = req.body;

    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username.toLowerCase()]);
    if (existing.length) return R.badRequest(res, 'Username already taken');

    const hashed = await bcrypt.hash(password, 10);
    const id = uuidv4();

    await pool.query(
      'INSERT INTO users (id, name, username, password, role, email, phone, department) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, username.toLowerCase(), hashed, role, email || null, phone || null, department || null]
    );

    const [rows] = await pool.query(`SELECT ${SAFE_COLS} FROM users WHERE id = ? LIMIT 1`, [id]);
    return R.created(res, rows[0], 'User created');
  } catch (err) {
    return R.serverError(res, err);
  }
}

// PATCH /api/users/:id
async function update(req, res) {
  try {
    const { name, email, phone, department, status, role } = req.body;
    const fields = [];
    const params = [];

    if (name !== undefined)       { fields.push('name = ?');       params.push(name); }
    if (email !== undefined)      { fields.push('email = ?');      params.push(email); }
    if (phone !== undefined)      { fields.push('phone = ?');      params.push(phone); }
    if (department !== undefined) { fields.push('department = ?'); params.push(department); }
    if (status !== undefined)     { fields.push('status = ?');     params.push(status); }
    if (role !== undefined)       { fields.push('role = ?');       params.push(role); }

    if (!fields.length) return R.badRequest(res, 'Nothing to update');

    params.push(req.params.id);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);

    const [rows] = await pool.query(`SELECT ${SAFE_COLS} FROM users WHERE id = ? LIMIT 1`, [req.params.id]);
    if (!rows.length) return R.notFound(res, 'User not found');
    return R.success(res, rows[0], 'User updated');
  } catch (err) {
    return R.serverError(res, err);
  }
}

// PATCH /api/users/:id/password
async function changePassword(req, res) {
  try {
    const { password } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.params.id]);
    return R.success(res, {}, 'Password updated');
  } catch (err) {
    return R.serverError(res, err);
  }
}

// DELETE /api/users/:id
async function remove(req, res) {
  try {
    // Prevent self-deletion
    if (req.params.id === req.user.id) return R.badRequest(res, 'Cannot delete yourself');
    await pool.query('UPDATE users SET status = "inactive" WHERE id = ?', [req.params.id]);
    return R.success(res, {}, 'User deactivated');
  } catch (err) {
    return R.serverError(res, err);
  }
}

module.exports = { list, getOne, create, update, changePassword, remove };