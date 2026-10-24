const { query } = require('../config/db');
const { ok, created, fail } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

/** GET /api/memberships (admin) — with member name + filters */
const list = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const where = [];
  const params = [];
  if (status) { params.push(status); where.push(`ms.status = $${params.length}`); }
  if (search) { params.push(`%${search}%`); where.push(`m.full_name ILIKE $${params.length}`); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const countRes = await query(
    `SELECT COUNT(*)::int AS total FROM memberships ms JOIN members m ON m.id = ms.member_id ${whereSql}`,
    params
  );
  const rowsRes = await query(
    `SELECT ms.*, m.full_name AS member_name, m.member_code, m.email AS member_email
     FROM memberships ms JOIN members m ON m.id = ms.member_id
     ${whereSql} ORDER BY ms.created_at DESC LIMIT ${limit} OFFSET ${offset}`,
    params
  );
  return ok(res, {
    items: rowsRes.rows,
    pagination: { page, limit, total: countRes.rows[0].total, pages: Math.ceil(countRes.rows[0].total / limit) || 1 },
  });
});

const create = asyncHandler(async (req, res) => {
  const { member_id, plan_id, start_date } = req.body;
  const planRes = await query('SELECT * FROM membership_plans WHERE id = $1', [plan_id]);
  if (!planRes.rows.length) return fail(res, 'Plan not found', 400);
  const plan = planRes.rows[0];

  const start = start_date ? new Date(start_date) : new Date();
  const end = new Date(start);
  end.setMonth(end.getMonth() + plan.duration_months);

  const { rows } = await query(
    `INSERT INTO memberships (member_id, plan_id, plan_name, price, start_date, end_date, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [member_id, plan.id, plan.name, plan.price,
     start.toISOString().slice(0, 10), end.toISOString().slice(0, 10),
     req.body.status || 'active']
  );
  return created(res, rows[0], 'Membership created');
});

/** PATCH /api/memberships/:id/status */
const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const valid = ['active', 'expired', 'pending', 'cancelled'];
  if (!valid.includes(status)) return fail(res, 'Invalid status', 400);

  const { rows } = await query(
    'UPDATE memberships SET status = $1 WHERE id = $2 RETURNING *',
    [status, req.params.id]
  );
  if (!rows.length) return fail(res, 'Membership not found', 404);

  // Keep the member record's status in sync when activating
  if (status === 'active') {
    await query('UPDATE members SET status = $1 WHERE id = $2', ['active', rows[0].member_id]);
  }
  return ok(res, rows[0], 'Membership status updated');
});

const remove = asyncHandler(async (req, res) => {
  const { rowCount } = await query('DELETE FROM memberships WHERE id = $1', [req.params.id]);
  if (!rowCount) return fail(res, 'Membership not found', 404);
  return ok(res, {}, 'Membership deleted');
});

module.exports = { list, create, updateStatus, remove };
