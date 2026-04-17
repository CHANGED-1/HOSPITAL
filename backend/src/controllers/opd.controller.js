const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/db');
const R = require('../utils/response');

const JOIN = `
  FROM opd_visits v
  JOIN patients p ON v.patient_id = p.id
  LEFT JOIN users d ON v.doctor_id = d.id
`;
const COLS = `v.*, CONCAT(p.first_name,' ',p.last_name) AS patient_name, p.patient_number, d.name AS doctor_name`;

// GET /api/opd
async function list(req, res) {
  try {
    const { date, doctor_id, patient_id, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const where = [];
    const params = [];

    if (date)       { where.push('v.visit_date = ?');  params.push(date); }
    if (doctor_id)  { where.push('v.doctor_id = ?');   params.push(doctor_id); }
    if (patient_id) { where.push('v.patient_id = ?');  params.push(patient_id); }
    if (status)     { where.push('v.status = ?');      params.push(status); }

    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total ${JOIN} ${clause}`, params);
    const [rows] = await pool.query(
      `SELECT ${COLS} ${JOIN} ${clause} ORDER BY v.visit_date DESC, v.created_at DESC LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );
    return R.paginated(res, rows, total, page, limit);
  } catch (err) {
    return R.serverError(res, err);
  }
}

// GET /api/opd/:id
async function getOne(req, res) {
  try {
    const [rows] = await pool.query(`SELECT ${COLS} ${JOIN} WHERE v.id = ? LIMIT 1`, [req.params.id]);
    if (!rows.length) return R.notFound(res, 'Visit not found');
    return R.success(res, rows[0]);
  } catch (err) {
    return R.serverError(res, err);
  }
}

// POST /api/opd
async function create(req, res) {
  try {
    const { patient_id, doctor_id, visit_date, chief_complaint, vitals } = req.body;
    const id = uuidv4();

    await pool.query(
      'INSERT INTO opd_visits (id, patient_id, doctor_id, visit_date, chief_complaint, vitals, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, patient_id, doctor_id || null, visit_date, chief_complaint || null,
       vitals ? JSON.stringify(vitals) : null, req.user.id]
    );

    const [rows] = await pool.query(`SELECT ${COLS} ${JOIN} WHERE v.id = ? LIMIT 1`, [id]);
    return R.created(res, rows[0], 'OPD visit created');
  } catch (err) {
    return R.serverError(res, err);
  }
}

// PATCH /api/opd/:id
async function update(req, res) {
  try {
    const allowed = ['doctor_id','chief_complaint','diagnosis','treatment_plan','prescription',
                     'follow_up_date','status','vitals'];
    const fields = [];
    const params = [];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(key === 'vitals' ? JSON.stringify(req.body[key]) : req.body[key]);
      }
    }
    if (!fields.length) return R.badRequest(res, 'Nothing to update');

    params.push(req.params.id);
    await pool.query(`UPDATE opd_visits SET ${fields.join(', ')} WHERE id = ?`, params);
    const [rows] = await pool.query(`SELECT ${COLS} ${JOIN} WHERE v.id = ? LIMIT 1`, [req.params.id]);
    return R.success(res, rows[0], 'Visit updated');
  } catch (err) {
    return R.serverError(res, err);
  }
}

module.exports = { list, getOne, create, update };