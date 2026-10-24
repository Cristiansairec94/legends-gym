const { query } = require('../config/db');
const { ok } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

/** GET /api/content (public) — returns { key: value } map */
const getAll = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT key, value FROM site_content');
  const map = {};
  rows.forEach((r) => { map[r.key] = r.value; });
  return ok(res, map);
});

/** PUT /api/content (admin) — upsert a batch of key/values from body object */
const updateBatch = asyncHandler(async (req, res) => {
  const entries = Object.entries(req.body || {});
  for (const [key, value] of entries) {
    await query(
      `INSERT INTO site_content (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [key, value]
    );
  }
  const { rows } = await query('SELECT key, value FROM site_content');
  const map = {};
  rows.forEach((r) => { map[r.key] = r.value; });
  return ok(res, map, 'Content updated');
});

module.exports = { getAll, updateBatch };
