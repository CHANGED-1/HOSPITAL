const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/db');
const R = require('../utils/response');

// ─── Drugs ────────────────────────────────────────────────────────

async function listDrugs(req, res) {
  try {
    const { search, category, status = 'active', low_stock, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const where = ['status = ?'];
    const params = [status];

    if (category)  { where.push('category = ?');   params.push(category); }
    if (search)    { where.push('(name LIKE ? OR generic_name LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
    if (low_stock) { where.push('quantity_in_stock <= reorder_level'); }

    const clause = `WHERE ${where.join(' AND ')}`;
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM drugs ${clause}`, params);
    const [rows] = await pool.query(
      `SELECT * FROM drugs ${clause} ORDER BY name ASC LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );
    return R.paginated(res, rows, total, page, limit);
  } catch (err) {
    return R.serverError(res, err);
  }
}

async function getDrug(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM drugs WHERE id = ? LIMIT 1', [req.params.id]);
    if (!rows.length) return R.notFound(res, 'Drug not found');
    return R.success(res, rows[0]);
  } catch (err) {
    return R.serverError(res, err);
  }
}

async function createDrug(req, res) {
  try {
    const { name, generic_name, category, unit, quantity_in_stock, reorder_level, unit_price, expiry_date, supplier } = req.body;
    const id = uuidv4();

    await pool.query(
      `INSERT INTO drugs (id, name, generic_name, category, unit, quantity_in_stock, reorder_level, unit_price, expiry_date, supplier, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, generic_name || null, category || null, unit || null,
       quantity_in_stock || 0, reorder_level || 10, unit_price || 0,
       expiry_date || null, supplier || null, req.user.id]
    );

    const [rows] = await pool.query('SELECT * FROM drugs WHERE id = ?', [id]);
    return R.created(res, rows[0], 'Drug added');
  } catch (err) {
    return R.serverError(res, err);
  }
}

async function updateDrug(req, res) {
  try {
    const allowed = ['name','generic_name','category','unit','quantity_in_stock',
                     'reorder_level','unit_price','expiry_date','supplier','status'];
    const fields = [];
    const params = [];

    for (const key of allowed) {
      if (req.body[key] !== undefined) { fields.push(`${key} = ?`); params.push(req.body[key]); }
    }
    if (!fields.length) return R.badRequest(res, 'Nothing to update');

    params.push(req.params.id);
    await pool.query(`UPDATE drugs SET ${fields.join(', ')} WHERE id = ?`, params);
    const [rows] = await pool.query('SELECT * FROM drugs WHERE id = ?', [req.params.id]);
    return R.success(res, rows[0], 'Drug updated');
  } catch (err) {
    return R.serverError(res, err);
  }
}

// PATCH /api/pharmacy/drugs/:id/stock  { adjustment: +50 or -10, note }
async function adjustStock(req, res) {
  try {
    const { adjustment } = req.body;
    if (typeof adjustment !== 'number') return R.badRequest(res, 'adjustment must be a number');

    const [rows] = await pool.query('SELECT * FROM drugs WHERE id = ?', [req.params.id]);
    if (!rows.length) return R.notFound(res, 'Drug not found');

    const newQty = rows[0].quantity_in_stock + adjustment;
    if (newQty < 0) return R.badRequest(res, 'Stock cannot go below 0');

    await pool.query('UPDATE drugs SET quantity_in_stock = ? WHERE id = ?', [newQty, req.params.id]);
    const [updated] = await pool.query('SELECT * FROM drugs WHERE id = ?', [req.params.id]);
    return R.success(res, updated[0], 'Stock adjusted');
  } catch (err) {
    return R.serverError(res, err);
  }
}

// ─── Prescriptions ────────────────────────────────────────────────

async function listPrescriptions(req, res) {
  try {
    const { patient_id, dispensed, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const where = [];
    const params = [];

    if (patient_id)          { where.push('pr.patient_id = ?'); params.push(patient_id); }
    if (dispensed !== undefined) { where.push('pr.dispensed = ?'); params.push(dispensed === 'true' ? 1 : 0); }

    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const JOIN = `FROM prescriptions pr JOIN drugs d ON pr.drug_id = d.id JOIN patients p ON pr.patient_id = p.id`;
    const COLS = `pr.*, d.name AS drug_name, d.unit, CONCAT(p.first_name,' ',p.last_name) AS patient_name`;

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total ${JOIN} ${clause}`, params);
    const [rows] = await pool.query(
      `SELECT ${COLS} ${JOIN} ${clause} ORDER BY pr.created_at DESC LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );
    return R.paginated(res, rows, total, page, limit);
  } catch (err) {
    return R.serverError(res, err);
  }
}

async function dispense(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM prescriptions WHERE id = ?', [req.params.id]);
    if (!rows.length) return R.notFound(res, 'Prescription not found');
    if (rows[0].dispensed) return R.badRequest(res, 'Already dispensed');

    const script = rows[0];
    const [drugRows] = await pool.query('SELECT * FROM drugs WHERE id = ?', [script.drug_id]);
    if (!drugRows.length) return R.notFound(res, 'Drug not found');
    if (drugRows[0].quantity_in_stock < script.quantity) {
      return R.badRequest(res, `Insufficient stock. Available: ${drugRows[0].quantity_in_stock}`);
    }

    await pool.query('UPDATE drugs SET quantity_in_stock = quantity_in_stock - ? WHERE id = ?', [script.quantity, script.drug_id]);
    await pool.query(
      'UPDATE prescriptions SET dispensed = 1, dispensed_by = ?, dispensed_at = NOW() WHERE id = ?',
      [req.user.id, req.params.id]
    );

    return R.success(res, {}, 'Prescription dispensed');
  } catch (err) {
    return R.serverError(res, err);
  }
}

module.exports = { listDrugs, getDrug, createDrug, updateDrug, adjustStock, listPrescriptions, dispense };