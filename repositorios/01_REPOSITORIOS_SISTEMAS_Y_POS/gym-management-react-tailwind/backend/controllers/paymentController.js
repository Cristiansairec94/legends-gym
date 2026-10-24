const { query } = require('../config/db');
const { ok, created, fail } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

/** GET /api/payments (admin) */
const list = asyncHandler(async (req, res) => {
  const { status, method, search } = req.query;
  const where = [];
  const params = [];
  if (status) { params.push(status); where.push(`p.status = $${params.length}`); }
  if (method) { params.push(method); where.push(`p.method = $${params.length}`); }
  if (search) { params.push(`%${search}%`); where.push(`(m.full_name ILIKE $${params.length} OR p.reference ILIKE $${params.length})`); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const countRes = await query(
    `SELECT COUNT(*)::int AS total FROM payments p LEFT JOIN members m ON m.id = p.member_id ${whereSql}`,
    params
  );
  const rowsRes = await query(
    `SELECT p.*, m.full_name AS member_name, m.member_code
     FROM payments p LEFT JOIN members m ON m.id = p.member_id
     ${whereSql} ORDER BY p.created_at DESC LIMIT ${limit} OFFSET ${offset}`,
    params
  );
  return ok(res, {
    items: rowsRes.rows,
    pagination: { page, limit, total: countRes.rows[0].total, pages: Math.ceil(countRes.rows[0].total / limit) || 1 },
  });
});

const create = asyncHandler(async (req, res) => {
  const { member_id, membership_id, amount, method, reference, status, paid_at, notes } = req.body;
  const { rows } = await query(
    `INSERT INTO payments (member_id, membership_id, amount, method, reference, status, paid_at, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [member_id || null, membership_id || null, amount, method || 'cash',
     reference || null, status || 'pending', paid_at || null, notes || null]
  );
  return created(res, rows[0], 'Payment recorded');
});

const update = asyncHandler(async (req, res) => {
  const fields = ['amount', 'method', 'reference', 'status', 'paid_at', 'notes'];
  const cols = fields.filter((f) => req.body[f] !== undefined);
  if (!cols.length) return fail(res, 'No valid fields provided', 400);
  const set = cols.map((c, i) => `${c} = $${i + 1}`);
  const values = cols.map((c) => req.body[c]);
  values.push(req.params.id);
  const { rows } = await query(
    `UPDATE payments SET ${set.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values
  );
  if (!rows.length) return fail(res, 'Payment not found', 404);

  // If a membership payment is marked paid, activate the membership + member
  if (req.body.status === 'paid' && rows[0].membership_id) {
    await query("UPDATE memberships SET status = 'active' WHERE id = $1 AND status = 'pending'", [rows[0].membership_id]);
    if (rows[0].member_id) {
      await query("UPDATE members SET status = 'active' WHERE id = $1 AND status = 'pending'", [rows[0].member_id]);
    }
  }
  return ok(res, rows[0], 'Payment updated');
});

const remove = asyncHandler(async (req, res) => {
  const { rowCount } = await query('DELETE FROM payments WHERE id = $1', [req.params.id]);
  if (!rowCount) return fail(res, 'Payment not found', 404);
  return ok(res, {}, 'Payment deleted');
});

module.exports = { list, create, update, remove };
