const { query, getClient } = require('../config/db');
const { ok, created, fail } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const { memberCode } = require('../utils/codes');

/**
 * POST /api/members/register  (public)
 * Creates a member profile + a membership for the chosen plan, in one transaction.
 * Payment is recorded separately by admin — no fake payment success here.
 */
const registerMembership = asyncHandler(async (req, res) => {
  const {
    full_name, email, phone, date_of_birth, gender, address,
    emergency_contact, plan_id, start_date, notes,
  } = req.body;

  const planRes = await query(
    'SELECT * FROM membership_plans WHERE id = $1 AND is_active = TRUE',
    [plan_id]
  );
  if (!planRes.rows.length) return fail(res, 'Selected plan is not available', 400);
  const plan = planRes.rows[0];

  const start = start_date ? new Date(start_date) : new Date();
  const end = new Date(start);
  end.setMonth(end.getMonth() + plan.duration_months);

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const memberRes = await client.query(
      `INSERT INTO members
        (full_name, email, phone, date_of_birth, gender, address, emergency_contact, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending') RETURNING *`,
      [full_name, email, phone || null, date_of_birth || null, gender || null,
       address || null, emergency_contact || null, notes || null]
    );
    const member = memberRes.rows[0];

    await client.query('UPDATE members SET member_code = $1 WHERE id = $2', [
      memberCode(member.id), member.id,
    ]);

    const membershipRes = await client.query(
      `INSERT INTO memberships
        (member_id, plan_id, plan_name, price, start_date, end_date, status)
       VALUES ($1,$2,$3,$4,$5,$6,'pending') RETURNING *`,
      [member.id, plan.id, plan.name, plan.price,
       start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)]
    );

    // Pending payment record so admin can confirm later
    await client.query(
      `INSERT INTO payments (member_id, membership_id, amount, method, status)
       VALUES ($1,$2,$3,'cash','pending')`,
      [member.id, membershipRes.rows[0].id, plan.price]
    );

    await client.query('COMMIT');
    return created(
      res,
      { member: { ...member, member_code: memberCode(member.id) }, membership: membershipRes.rows[0] },
      'Membership registration submitted. Our team will confirm your payment shortly.'
    );
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

/** GET /api/members  (admin) — search + filters + pagination */
const list = asyncHandler(async (req, res) => {
  const { search, status, plan_id } = req.query;
  const where = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    where.push(`(m.full_name ILIKE $${params.length} OR m.email ILIKE $${params.length} OR m.phone ILIKE $${params.length} OR m.member_code ILIKE $${params.length})`);
  }
  if (status) {
    params.push(status);
    where.push(`m.status = $${params.length}`);
  }
  if (plan_id) {
    params.push(plan_id);
    where.push(`cm.plan_id = $${params.length}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  // current membership (latest) joined via lateral
  const base = `
    FROM members m
    LEFT JOIN LATERAL (
      SELECT plan_id, plan_name, end_date FROM memberships
      WHERE member_id = m.id ORDER BY start_date DESC LIMIT 1
    ) cm ON TRUE
    ${whereSql}`;

  const countRes = await query(`SELECT COUNT(*)::int AS total ${base}`, params);
  const total = countRes.rows[0].total;

  const rowsRes = await query(
    `SELECT m.*, cm.plan_name AS current_plan, cm.end_date AS current_end_date
     ${base} ORDER BY m.created_at DESC LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  return ok(res, {
    items: rowsRes.rows,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  });
});

/** GET /api/members/:id  (admin) — full profile with history */
const getOne = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const memberRes = await query('SELECT * FROM members WHERE id = $1', [id]);
  if (!memberRes.rows.length) return fail(res, 'Member not found', 404);

  const [memberships, payments, appointments, orders] = await Promise.all([
    query('SELECT * FROM memberships WHERE member_id = $1 ORDER BY start_date DESC', [id]),
    query('SELECT * FROM payments WHERE member_id = $1 ORDER BY created_at DESC', [id]),
    query('SELECT * FROM appointments WHERE member_id = $1 ORDER BY appointment_date DESC', [id]),
    query('SELECT * FROM orders WHERE member_id = $1 ORDER BY created_at DESC', [id]),
  ]);

  return ok(res, {
    member: memberRes.rows[0],
    memberships: memberships.rows,
    payments: payments.rows,
    appointments: appointments.rows,
    orders: orders.rows,
  });
});

const UPDATABLE = ['full_name', 'email', 'phone', 'date_of_birth', 'gender', 'address', 'emergency_contact', 'photo_url', 'status', 'notes'];

/** POST /api/members  (admin) */
const create = asyncHandler(async (req, res) => {
  const cols = UPDATABLE.filter((c) => req.body[c] !== undefined);
  const values = cols.map((c) => req.body[c]);
  const placeholders = cols.map((_, i) => `$${i + 1}`);
  const { rows } = await query(
    `INSERT INTO members (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
    values
  );
  await query('UPDATE members SET member_code = $1 WHERE id = $2 AND member_code IS NULL', [
    memberCode(rows[0].id), rows[0].id,
  ]);
  return created(res, rows[0], 'Member created');
});

/** PUT /api/members/:id  (admin) */
const update = asyncHandler(async (req, res) => {
  const cols = UPDATABLE.filter((c) => req.body[c] !== undefined);
  if (!cols.length) return fail(res, 'No valid fields provided', 400);
  const set = cols.map((c, i) => `${c} = $${i + 1}`);
  const values = cols.map((c) => req.body[c]);
  values.push(req.params.id);
  const { rows } = await query(
    `UPDATE members SET ${set.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values
  );
  if (!rows.length) return fail(res, 'Member not found', 404);
  return ok(res, rows[0], 'Member updated');
});

/** DELETE /api/members/:id  (admin) */
const remove = asyncHandler(async (req, res) => {
  const { rowCount } = await query('DELETE FROM members WHERE id = $1', [req.params.id]);
  if (!rowCount) return fail(res, 'Member not found', 404);
  return ok(res, {}, 'Member deleted');
});

/**
 * POST /api/members/refresh-status  (admin)
 * Recomputes member + membership status from end_date (expiry handling).
 */
const refreshStatuses = asyncHandler(async (req, res) => {
  await query(`UPDATE memberships SET status = 'expired'
               WHERE end_date < CURRENT_DATE AND status = 'active'`);
  await query(`
    UPDATE members m SET status = 'expired'
    WHERE m.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM memberships ms
        WHERE ms.member_id = m.id AND ms.status = 'active' AND ms.end_date >= CURRENT_DATE
      )`);
  return ok(res, {}, 'Statuses refreshed');
});

module.exports = { registerMembership, list, getOne, create, update, remove, refreshStatuses };
