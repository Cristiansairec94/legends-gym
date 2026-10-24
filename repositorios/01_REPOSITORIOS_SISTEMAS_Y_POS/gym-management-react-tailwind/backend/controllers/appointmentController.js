const { query } = require('../config/db');
const { ok, created, fail } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

/** POST /api/appointments (public booking) */
const create = asyncHandler(async (req, res) => {
  const { customer_name, email, phone, trainer_id, service_id, appointment_date, appointment_time, notes } = req.body;

  // Reject past dates
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const date = new Date(appointment_date);
  if (Number.isNaN(date.getTime()) || date < today) {
    return fail(res, 'Please choose a valid future date', 400);
  }

  // Validate references if supplied
  if (trainer_id) {
    const t = await query('SELECT 1 FROM trainers WHERE id = $1 AND is_active = TRUE', [trainer_id]);
    if (!t.rows.length) return fail(res, 'Selected trainer is not available', 400);
  }
  if (service_id) {
    const s = await query('SELECT 1 FROM services WHERE id = $1 AND is_active = TRUE', [service_id]);
    if (!s.rows.length) return fail(res, 'Selected service is not available', 400);
  }

  // Link to member if email matches
  const memberRes = await query('SELECT id FROM members WHERE email = $1 LIMIT 1', [email]);
  const memberId = memberRes.rows[0]?.id || null;

  const { rows } = await query(
    `INSERT INTO appointments
       (member_id, trainer_id, service_id, customer_name, email, phone, appointment_date, appointment_time, notes, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending') RETURNING *`,
    [memberId, trainer_id || null, service_id || null, customer_name, email, phone || null,
     appointment_date, appointment_time, notes || null]
  );
  return created(res, rows[0], 'Appointment booked. We will confirm shortly.');
});

/** GET /api/appointments (admin) */
const list = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const where = [];
  const params = [];
  if (status) { params.push(status); where.push(`a.status = $${params.length}`); }
  if (search) { params.push(`%${search}%`); where.push(`(a.customer_name ILIKE $${params.length} OR a.email ILIKE $${params.length})`); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const countRes = await query(`SELECT COUNT(*)::int AS total FROM appointments a ${whereSql}`, params);
  const rowsRes = await query(
    `SELECT a.*, t.name AS trainer_name, s.title AS service_title
     FROM appointments a
     LEFT JOIN trainers t ON t.id = a.trainer_id
     LEFT JOIN services s ON s.id = a.service_id
     ${whereSql} ORDER BY a.appointment_date DESC, a.appointment_time DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );
  return ok(res, {
    items: rowsRes.rows,
    pagination: { page, limit, total: countRes.rows[0].total, pages: Math.ceil(countRes.rows[0].total / limit) || 1 },
  });
});

const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const valid = ['pending', 'confirmed', 'completed', 'cancelled'];
  if (!valid.includes(status)) return fail(res, 'Invalid status', 400);
  const { rows } = await query('UPDATE appointments SET status = $1 WHERE id = $2 RETURNING *', [status, req.params.id]);
  if (!rows.length) return fail(res, 'Appointment not found', 404);
  return ok(res, rows[0], 'Appointment updated');
});

const remove = asyncHandler(async (req, res) => {
  const { rowCount } = await query('DELETE FROM appointments WHERE id = $1', [req.params.id]);
  if (!rowCount) return fail(res, 'Appointment not found', 404);
  return ok(res, {}, 'Appointment deleted');
});

module.exports = { create, list, updateStatus, remove };
