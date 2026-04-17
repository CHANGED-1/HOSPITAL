const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/db');
const R = require('../utils/response');

// GET /api/billing
async function list(req, res) {
  try {
    const { patient_id, status, from_date, to_date, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const where = [];
    const params = [];

    if (patient_id) { where.push('b.patient_id = ?');    params.push(patient_id); }
    if (status)     { where.push('b.status = ?');         params.push(status); }
    if (from_date)  { where.push('b.bill_date >= ?');     params.push(from_date); }
    if (to_date)    { where.push('b.bill_date <= ?');     params.push(to_date); }

    const JOIN = `FROM bills b JOIN patients p ON b.patient_id = p.id LEFT JOIN users u ON b.created_by = u.id`;
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const COLS = `b.*, CONCAT(p.first_name,' ',p.last_name) AS patient_name, p.patient_number, u.name AS created_by_name`;

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total ${JOIN} ${clause}`, params);
    const [rows] = await pool.query(
      `SELECT ${COLS} ${JOIN} ${clause} ORDER BY b.bill_date DESC LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );
    return R.paginated(res, rows, total, page, limit);
  } catch (err) {
    return R.serverError(res, err);
  }
}

// GET /api/billing/:id
async function getOne(req, res) {
  try {
    const [bills] = await pool.query(
      `SELECT b.*, CONCAT(p.first_name,' ',p.last_name) AS patient_name, p.patient_number
       FROM bills b JOIN patients p ON b.patient_id = p.id WHERE b.id = ? LIMIT 1`,
      [req.params.id]
    );
    if (!bills.length) return R.notFound(res, 'Bill not found');
    const [items] = await pool.query('SELECT * FROM bill_items WHERE bill_id = ?', [req.params.id]);
    return R.success(res, { ...bills[0], items });
  } catch (err) {
    return R.serverError(res, err);
  }
}

// POST /api/billing
async function create(req, res) {
  try {
    const { patient_id, visit_id, bill_date, items = [], discount = 0, payment_method, notes } = req.body;
    const id = uuidv4();

    const total_amount = items.reduce((sum, i) => sum + (i.unit_price * i.quantity), 0);

    await pool.query(
      'INSERT INTO bills (id, patient_id, visit_id, bill_date, total_amount, discount, payment_method, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, patient_id, visit_id || null, bill_date, total_amount, discount, payment_method || null, notes || null, req.user.id]
    );

    for (const item of items) {
      await pool.query(
        'INSERT INTO bill_items (id, bill_id, description, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?, ?)',
        [uuidv4(), id, item.description, item.quantity, item.unit_price, item.unit_price * item.quantity]
      );
    }

    const [rows] = await pool.query('SELECT * FROM bills WHERE id = ?', [id]);
    const [billItems] = await pool.query('SELECT * FROM bill_items WHERE bill_id = ?', [id]);
    return R.created(res, { ...rows[0], items: billItems }, 'Bill created');
  } catch (err) {
    return R.serverError(res, err);
  }
}

// PATCH /api/billing/:id/payment
async function recordPayment(req, res) {
  try {
    const { amount, payment_method } = req.body;
    const [rows] = await pool.query('SELECT * FROM bills WHERE id = ?', [req.params.id]);
    if (!rows.length) return R.notFound(res, 'Bill not found');

    const bill = rows[0];
    const newPaid = parseFloat(bill.paid_amount) + parseFloat(amount);
    const net = parseFloat(bill.total_amount) - parseFloat(bill.discount);
    const status = newPaid >= net ? 'paid' : 'partial';

    await pool.query(
      'UPDATE bills SET paid_amount = ?, payment_method = ?, status = ? WHERE id = ?',
      [newPaid, payment_method || bill.payment_method, status, req.params.id]
    );

    const [updated] = await pool.query('SELECT * FROM bills WHERE id = ?', [req.params.id]);
    return R.success(res, updated[0], 'Payment recorded');
  } catch (err) {
    return R.serverError(res, err);
  }
}

// GET /api/billing/summary  (admin/accountant only)
async function summary(req, res) {
  try {
    const { from_date, to_date } = req.query;
    const where = [];
    const params = [];

    if (from_date) { where.push('bill_date >= ?'); params.push(from_date); }
    if (to_date)   { where.push('bill_date <= ?'); params.push(to_date); }

    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [[stats]] = await pool.query(
      `SELECT
         COUNT(*) AS total_bills,
         SUM(total_amount) AS gross_revenue,
         SUM(discount) AS total_discounts,
         SUM(paid_amount) AS total_collected,
         SUM(total_amount - discount - paid_amount) AS outstanding
       FROM bills ${clause}`,
      params
    );

    const [byStatus] = await pool.query(
      `SELECT status, COUNT(*) AS count, SUM(total_amount) AS total FROM bills ${clause} GROUP BY status`,
      params
    );

    return R.success(res, { ...stats, by_status: byStatus });
  } catch (err) {
    return R.serverError(res, err);
  }
}

module.exports = { list, getOne, create, recordPayment, summary };