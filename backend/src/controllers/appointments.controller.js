const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/db');
const R = require('../utils/response');

const JOIN = `
  FROM appointments a
  JOIN patients p ON a.patient_id = p.id
  JOIN users d    ON a.doctor_id  = d.id
  LEFT JOIN users c ON a.created_by = c.id
`;
const COLS = `a.*, CONCAT(p.first_name,' ',p.last_name) AS patient_name, p.patient_number,
              d.name AS doctor_name, c.name AS created_by_name`;

// GET /api/appointments
async function list(req, res) {
  try {
    const { date, doctor_id, patient_id, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const where = [];
    const params = [];

    if (date)       { where.push('a.appointment_date = ?'); params.push(date); }
    if (doctor_id)  { where.push('a.doctor_id = ?');        params.push(doctor_id); }
    if (patient_id) { where.push('a.patient_id = ?');       params.push(patient_id); }
    if (status)     { where.push('a.status = ?');           params.push(status); }

    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total ${JOIN} ${clause}`, params);
    const [rows] = await pool.query(
      `SELECT ${COLS} ${JOIN} ${clause} ORDER BY a.appointment_date DESC, a.appointment_time DESC LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );
    return R.paginated(res, rows, total, page, limit);
  } catch (err) {
    return R.serverError(res, err);
  }
}

// GET /api/appointments/:id
async function getOne(req, res) {
  try {
    const [rows] = await pool.query(`SELECT ${COLS} ${JOIN} WHERE a.id = ? LIMIT 1`, [req.params.id]);
    if (!rows.length) return R.notFound(res, 'Appointment not found');
    return R.success(res, rows[0]);
  } catch (err) {
    return R.serverError(res, err);
  }
}

// POST /api/appointments
async function create(req, res) {
  try {
    const { patient_id, doctor_id, appointment_date, appointment_time, reason } = req.body;
    const id = uuidv4();

    await pool.query(
      'INSERT INTO appointments (id, patient_id, doctor_id, appointment_date, appointment_time, reason, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, patient_id, doctor_id, appointment_date, appointment_time, reason || null, req.user.id]
    );

    const [rows] = await pool.query(`SELECT ${COLS} ${JOIN} WHERE a.id = ? LIMIT 1`, [id]);
    return R.created(res, rows[0], 'Appointment created');
  } catch (err) {
    return R.serverError(res, err);
  }
}

// PATCH /api/appointments/:id
async function update(req, res) {
  try {
    const allowed = ['appointment_date','appointment_time','reason','status','notes','doctor_id'];
    const fields = [];
    const params = [];

    for (const key of allowed) {
      if (req.body[key] !== undefined) { fields.push(`${key} = ?`); params.push(req.body[key]); }
    }
    if (!fields.length) return R.badRequest(res, 'Nothing to update');

    params.push(req.params.id);
    await pool.query(`UPDATE appointments SET ${fields.join(', ')} WHERE id = ?`, params);
    const [rows] = await pool.query(`SELECT ${COLS} ${JOIN} WHERE a.id = ? LIMIT 1`, [req.params.id]);
    return R.success(res, rows[0], 'Appointment updated');
  } catch (err) {
    return R.serverError(res, err);
  }
}

module.exports = { list, getOne, create, update };