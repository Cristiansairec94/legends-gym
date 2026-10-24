const { query } = require('../config/db');
const { ok, created, fail } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

/** POST /api/enquiries (public contact form) */
const create = asyncHandler(async (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  const { rows } = await query(
    `INSERT INTO enquiries (name, email, phone, subject, message, status)
     VALUES ($1,$2,$3,$4,$5,'new') RETURNING *`,
    [name, email, phone || null, subject || null, message]
  );
  return created(res, rows[0], 'Thanks for reaching out. We will get back to you soon.');
});

/** GET /api/enquiries (admin) */
const list = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const where = [];
  const params = [];
  if (status) { params.push(status); where.push(`status = $${params.length}`); }
  if (search) { params.push(`%${search}%`); where.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length} OR subject ILIKE $${params.length})`); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const countRes = await query(`SELECT COUNT(*)::int AS total FROM enquiries ${whereSql}`, params);
  const rowsRes = await query(
    `SELECT * FROM enquiries ${whereSql} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
    params
  );
  return ok(res, {
    items: rowsRes.rows,
    pagination: { page, limit, total: countRes.rows[0].total, pages: Math.ceil(countRes.rows[0].total / limit) || 1 },
  });
});

const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const valid = ['new', 'in_progress', 'replied', 'closed'];
  if (!valid.includes(status)) return fail(res, 'Invalid status', 400);
  const { rows } = await query('UPDATE enquiries SET status = $1 WHERE id = $2 RETURNING *', [status, req.params.id]);
  if (!rows.length) return fail(res, 'Enquiry not found', 404);
  return ok(res, rows[0], 'Enquiry updated');
});

const remove = asyncHandler(async (req, res) => {
  const { rowCount } = await query('DELETE FROM enquiries WHERE id = $1', [req.params.id]);
  if (!rowCount) return fail(res, 'Enquiry not found', 404);
  return ok(res, {}, 'Enquiry deleted');
});

module.exports = { create, list, updateStatus, remove };
