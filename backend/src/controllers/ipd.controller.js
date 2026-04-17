const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/db');
const R = require('../utils/response');

const JOIN = `
  FROM ipd_admissions i
  JOIN patients p ON i.patient_id = p.id
  LEFT JOIN users d ON i.doctor_id = d.id
`;
const COLS = `i.*, CONCAT(p.first_name,' ',p.last_name) AS patient_name, p.patient_number, d.name AS doctor_name`;

async function list(req, res) {
  try {
    const { status, doctor_id, patient_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const where = [];
    const params = [];

    if (status)     { where.push('i.status = ?');     params.push(status); }
    if (doctor_id)  { where.push('i.doctor_id = ?');  params.push(doctor_id); }
    if (patient_id) { where.push('i.patient_id = ?'); params.push(patient_id); }

    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total ${JOIN} ${clause}`, params);
    const [rows] = await pool.query(
      `SELECT ${COLS} ${JOIN} ${clause} ORDER BY i.admission_date DESC LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );
    return R.paginated(res, rows, total, page, limit);
  } catch (err) {
    return R.serverError(res, err);
  }
}

async function getOne(req, res) {
  try {
    const [rows] = await pool.query(`SELECT ${COLS} ${JOIN} WHERE i.id = ? LIMIT 1`, [req.params.id]);
    if (!rows.length) return R.notFound(res, 'Admission not found');
    return R.success(res, rows[0]);
  } catch (err) {
    return R.serverError(res, err);
  }
}

async function admit(req, res) {
  try {
    const { patient_id, doctor_id, ward, bed_number, admission_date, diagnosis } = req.body;
    const id = uuidv4();

    await pool.query(
      'INSERT INTO ipd_admissions (id, patient_id, doctor_id, ward, bed_number, admission_date, diagnosis, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, patient_id, doctor_id || null, ward || null, bed_number || null,
       admission_date, diagnosis || null, req.user.id]
    );

    const [rows] = await pool.query(`SELECT ${COLS} ${JOIN} WHERE i.id = ? LIMIT 1`, [id]);
    return R.created(res, rows[0], 'Patient admitted');
  } catch (err) {
    return R.serverError(res, err);
  }
}

async function update(req, res) {
  try {
    const allowed = ['doctor_id','ward','bed_number','diagnosis','treatment_notes',
                     'discharge_date','discharge_notes','status'];
    const fields = [];
    const params = [];

    for (const key of allowed) {
      if (req.body[key] !== undefined) { fields.push(`${key} = ?`); params.push(req.body[key]); }
    }
    if (!fields.length) return R.badRequest(res, 'Nothing to update');

    params.push(req.params.id);
    await pool.query(`UPDATE ipd_admissions SET ${fields.join(', ')} WHERE id = ?`, params);
    const [rows] = await pool.query(`SELECT ${COLS} ${JOIN} WHERE i.id = ? LIMIT 1`, [req.params.id]);
    return R.success(res, rows[0], 'Admission updated');
  } catch (err) {
    return R.serverError(res, err);
  }
}

module.exports = { list, getOne, admit, update };