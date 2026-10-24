const { query } = require('../config/db');
const { ok, created, fail } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

/** GET /api/reviews (public) — only approved; admin gets all with ?all=true */
const list = asyncHandler(async (req, res) => {
  const all = req.query.all === 'true';
  const sql = all
    ? 'SELECT * FROM reviews ORDER BY created_at DESC'
    : 'SELECT * FROM reviews WHERE is_approved = TRUE ORDER BY created_at DESC';
  const { rows } = await query(sql);
  return ok(res, { items: rows });
});

/** POST /api/reviews (public submit) — starts unapproved */
const create = asyncHandler(async (req, res) => {
  const { customer_name, role_label, rating, message } = req.body;
  const memberRes = req.body.email
    ? await query('SELECT id FROM members WHERE email = $1 LIMIT 1', [req.body.email])
    : { rows: [] };
  const { rows } = await query(
    `INSERT INTO reviews (member_id, customer_name, role_label, rating, message, is_approved)
     VALUES ($1,$2,$3,$4,$5, FALSE) RETURNING *`,
    [memberRes.rows[0]?.id || null, customer_name, role_label || null, rating || 5, message]
  );
  return created(res, rows[0], 'Thank you! Your review will appear after approval.');
});

/** PATCH /api/reviews/:id/approve */
const setApproval = asyncHandler(async (req, res) => {
  const approved = req.body.is_approved !== false;
  const { rows } = await query('UPDATE reviews SET is_approved = $1 WHERE id = $2 RETURNING *', [approved, req.params.id]);
  if (!rows.length) return fail(res, 'Review not found', 404);
  return ok(res, rows[0], approved ? 'Review approved' : 'Review unpublished');
});

const update = asyncHandler(async (req, res) => {
  const fields = ['customer_name', 'role_label', 'rating', 'message', 'is_approved'];
  const cols = fields.filter((f) => req.body[f] !== undefined);
  if (!cols.length) return fail(res, 'No valid fields provided', 400);
  const set = cols.map((c, i) => `${c} = $${i + 1}`);
  const values = cols.map((c) => req.body[c]);
  values.push(req.params.id);
  const { rows } = await query(`UPDATE reviews SET ${set.join(', ')} WHERE id = $${values.length} RETURNING *`, values);
  if (!rows.length) return fail(res, 'Review not found', 404);
  return ok(res, rows[0], 'Review updated');
});

const remove = asyncHandler(async (req, res) => {
  const { rowCount } = await query('DELETE FROM reviews WHERE id = $1', [req.params.id]);
  if (!rowCount) return fail(res, 'Review not found', 404);
  return ok(res, {}, 'Review deleted');
});

module.exports = { list, create, setApproval, update, remove };
