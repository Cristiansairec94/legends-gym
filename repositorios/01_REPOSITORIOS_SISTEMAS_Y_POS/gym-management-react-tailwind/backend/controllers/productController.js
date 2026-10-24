const { query } = require('../config/db');
const { ok, created, fail } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

/** GET /api/products — public storefront (active) + admin (?all=true) */
const list = asyncHandler(async (req, res) => {
  const { search, category_id, featured, all } = req.query;
  const where = [];
  const params = [];

  if (all !== 'true') where.push('p.is_active = TRUE');
  if (search) { params.push(`%${search}%`); where.push(`(p.name ILIKE $${params.length} OR p.brand ILIKE $${params.length})`); }
  if (category_id) { params.push(category_id); where.push(`p.category_id = $${params.length}`); }
  if (featured === 'true') where.push('p.is_featured = TRUE');

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 24));
  const offset = (page - 1) * limit;

  const countRes = await query(`SELECT COUNT(*)::int AS total FROM products p ${whereSql}`, params);
  const rowsRes = await query(
    `SELECT p.*, c.name AS category_name
     FROM products p LEFT JOIN product_categories c ON c.id = p.category_id
     ${whereSql} ORDER BY p.is_featured DESC, p.created_at DESC LIMIT ${limit} OFFSET ${offset}`,
    params
  );
  return ok(res, {
    items: rowsRes.rows,
    pagination: { page, limit, total: countRes.rows[0].total, pages: Math.ceil(countRes.rows[0].total / limit) || 1 },
  });
});

const getOne = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT p.*, c.name AS category_name
     FROM products p LEFT JOIN product_categories c ON c.id = p.category_id
     WHERE p.id = $1`,
    [req.params.id]
  );
  if (!rows.length) return fail(res, 'Product not found', 404);
  return ok(res, rows[0]);
});

const FIELDS = ['category_id', 'name', 'brand', 'sku', 'description', 'price', 'sale_price', 'stock', 'image_url', 'is_featured', 'is_active'];

const create = asyncHandler(async (req, res) => {
  const cols = FIELDS.filter((c) => req.body[c] !== undefined);
  const values = cols.map((c) => req.body[c]);
  const placeholders = cols.map((_, i) => `$${i + 1}`);
  const { rows } = await query(
    `INSERT INTO products (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
    values
  );
  return created(res, rows[0], 'Product created');
});

const update = asyncHandler(async (req, res) => {
  const cols = FIELDS.filter((c) => req.body[c] !== undefined);
  if (!cols.length) return fail(res, 'No valid fields provided', 400);
  const set = cols.map((c, i) => `${c} = $${i + 1}`);
  const values = cols.map((c) => req.body[c]);
  values.push(req.params.id);
  const { rows } = await query(
    `UPDATE products SET ${set.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values
  );
  if (!rows.length) return fail(res, 'Product not found', 404);
  return ok(res, rows[0], 'Product updated');
});

const remove = asyncHandler(async (req, res) => {
  const { rowCount } = await query('DELETE FROM products WHERE id = $1', [req.params.id]);
  if (!rowCount) return fail(res, 'Product not found', 404);
  return ok(res, {}, 'Product deleted');
});

module.exports = { list, getOne, create, update, remove };
