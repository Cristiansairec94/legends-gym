const { query } = require('../config/db');
const { ok, created, fail } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

const normalizeFeatures = (features) => {
  if (Array.isArray(features)) return JSON.stringify(features);
  if (typeof features === 'string') {
    // allow newline or comma separated input from admin forms
    const arr = features.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
    return JSON.stringify(arr);
  }
  return JSON.stringify([]);
};

/** GET /api/plans  (public) — active plans only unless ?all=true (admin) */
const list = asyncHandler(async (req, res) => {
  const all = req.query.all === 'true';
  const sql = all
    ? 'SELECT * FROM membership_plans ORDER BY price ASC'
    : 'SELECT * FROM membership_plans WHERE is_active = TRUE ORDER BY price ASC';
  const { rows } = await query(sql);
  return ok(res, { items: rows });
});

const getOne = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM membership_plans WHERE id = $1', [req.params.id]);
  if (!rows.length) return fail(res, 'Plan not found', 404);
  return ok(res, rows[0]);
});

const create = asyncHandler(async (req, res) => {
  const { name, description, price, duration_months, features, is_featured, is_active } = req.body;
  const { rows } = await query(
    `INSERT INTO membership_plans (name, description, price, duration_months, features, is_featured, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [name, description || null, price, duration_months, normalizeFeatures(features),
     is_featured ?? false, is_active ?? true]
  );
  return created(res, rows[0], 'Plan created successfully');
});

const update = asyncHandler(async (req, res) => {
  const { name, description, price, duration_months, features, is_featured, is_active } = req.body;
  const { rows } = await query(
    `UPDATE membership_plans SET
       name = COALESCE($1, name),
       description = COALESCE($2, description),
       price = COALESCE($3, price),
       duration_months = COALESCE($4, duration_months),
       features = COALESCE($5, features),
       is_featured = COALESCE($6, is_featured),
       is_active = COALESCE($7, is_active)
     WHERE id = $8 RETURNING *`,
    [name ?? null, description ?? null, price ?? null, duration_months ?? null,
     features !== undefined ? normalizeFeatures(features) : null,
     is_featured ?? null, is_active ?? null, req.params.id]
  );
  if (!rows.length) return fail(res, 'Plan not found', 404);
  return ok(res, rows[0], 'Plan updated successfully');
});

/** DELETE — soft delete (deactivate) to protect membership history */
const remove = asyncHandler(async (req, res) => {
  const used = await query('SELECT 1 FROM memberships WHERE plan_id = $1 LIMIT 1', [req.params.id]);
  if (used.rows.length) {
    const { rows } = await query(
      'UPDATE membership_plans SET is_active = FALSE WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (!rows.length) return fail(res, 'Plan not found', 404);
    return ok(res, rows[0], 'Plan is in use — deactivated instead of deleted to preserve history');
  }
  const { rowCount } = await query('DELETE FROM membership_plans WHERE id = $1', [req.params.id]);
  if (!rowCount) return fail(res, 'Plan not found', 404);
  return ok(res, {}, 'Plan deleted successfully');
});

module.exports = { list, getOne, create, update, remove };
