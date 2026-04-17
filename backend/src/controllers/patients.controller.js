const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/db');
const R = require('../utils/response');

// Auto-generate patient number: P-YYYYMMDD-XXXX
async function generatePatientNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const [[{ count }]] = await pool.query('SELECT COUNT(*) as count FROM patients');
  return `P-${date}-${String(count + 1).padStart(4, '0')}`;
}

// GET /api/patients
async function list(req, res) {
  try {
    const { search, status, gender, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const where = [];
    const params = [];

    if (status) { where.push('p.status = ?'); params.push(status); }
    if (gender) { where.push('p.gender = ?'); params.push(gender); }
    if (search) {
      where.push('(p.first_name LIKE ? OR p.last_name LIKE ? OR p.patient_number LIKE ? OR p.phone LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM patients p ${clause}`, params);
    const [rows] = await pool.query(
      `SELECT p.*, u.name AS created_by_name
       FROM patients p
       LEFT JOIN users u ON p.created_by = u.id
       ${clause}
       ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    return R.paginated(res, rows, total, page, limit);
  } catch (err) {
    return R.serverError(res, err);
  }
}

// GET /api/patients/:id
async function getOne(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, u.name AS created_by_name
       FROM patients p
       LEFT JOIN users u ON p.created_by = u.id
       WHERE p.id = ? LIMIT 1`,
      [req.params.id]
    );
    if (!rows.length) return R.notFound(res, 'Patient not found');
    return R.success(res, rows[0]);
  } catch (err) {
    return R.serverError(res, err);
  }
}

// POST /api/patients
async function create(req, res) {
  try {
    const {
      first_name, last_name, date_of_birth, gender, phone, address,
      next_of_kin, next_of_kin_phone, blood_group, allergies,
    } = req.body;

    const id = uuidv4();
    const patient_number = await generatePatientNumber();

    await pool.query(
      `INSERT INTO patients
         (id, patient_number, first_name, last_name, date_of_birth, gender, phone, address,
          next_of_kin, next_of_kin_phone, blood_group, allergies, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, patient_number, first_name, last_name, date_of_birth || null, gender || null,
       phone || null, address || null, next_of_kin || null, next_of_kin_phone || null,
       blood_group || null, allergies || null, req.user.id]
    );

    const [rows] = await pool.query('SELECT * FROM patients WHERE id = ?', [id]);
    return R.created(res, rows[0], 'Patient registered');
  } catch (err) {
    return R.serverError(res, err);
  }
}

// PATCH /api/patients/:id
async function update(req, res) {
  try {
    const allowed = ['first_name','last_name','date_of_birth','gender','phone','address',
                     'next_of_kin','next_of_kin_phone','blood_group','allergies','status'];
    const fields = [];
    const params = [];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(req.body[key]);
      }
    }

    if (!fields.length) return R.badRequest(res, 'Nothing to update');

    params.push(req.params.id);
    await pool.query(`UPDATE patients SET ${fields.join(', ')} WHERE id = ?`, params);

    const [rows] = await pool.query('SELECT * FROM patients WHERE id = ?', [req.params.id]);
    if (!rows.length) return R.notFound(res, 'Patient not found');
    return R.success(res, rows[0], 'Patient updated');
  } catch (err) {
    return R.serverError(res, err);
  }
}

// GET /api/patients/:id/history - visits, admissions, prescriptions
async function history(req, res) {
  try {
    const id = req.params.id;
    const [visits]      = await pool.query('SELECT * FROM opd_visits      WHERE patient_id = ? ORDER BY visit_date DESC', [id]);
    const [admissions]  = await pool.query('SELECT * FROM ipd_admissions  WHERE patient_id = ? ORDER BY admission_date DESC', [id]);
    const [scripts]     = await pool.query(
      `SELECT pr.*, d.name AS drug_name
       FROM prescriptions pr JOIN drugs d ON pr.drug_id = d.id
       WHERE pr.patient_id = ? ORDER BY pr.created_at DESC`, [id]);
    const [bills]       = await pool.query('SELECT * FROM bills           WHERE patient_id = ? ORDER BY bill_date DESC', [id]);

    return R.success(res, { visits, admissions, prescriptions: scripts, bills });
  } catch (err) {
    return R.serverError(res, err);
  }
}

module.exports = { list, getOne, create, update, history };