const { query } = require('../config/db');
const { ok, created, fail } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Build a set of CRUD handlers for a table.
 *
 * @param {object} cfg
 * @param {string} cfg.table         table name (trusted, from our code — never user input)
 * @param {string[]} cfg.columns     insertable/updatable columns
 * @param {string} [cfg.orderBy]     default ordering
 * @param {string[]} [cfg.searchable] columns matched by ?search=
 * @param {object} [cfg.filters]     map of query-param -> column for equality filters
 */
function crudController(cfg) {
  const {
    table,
    columns,
    orderBy = 'created_at DESC',
    searchable = [],
    filters = {},
  } = cfg;

  const list = asyncHandler(async (req, res) => {
    const where = [];
    const params = [];

    // Equality filters
    for (const [param, column] of Object.entries(filters)) {
      if (req.query[param] !== undefined && req.query[param] !== '') {
        params.push(req.query[param]);
        where.push(`${column} = $${params.length}`);
      }
    }

    // Search across searchable columns
    if (req.query.search && searchable.length) {
      params.push(`%${req.query.search}%`);
      const idx = params.length;
      where.push('(' + searchable.map((c) => `${c} ILIKE $${idx}`).join(' OR ') + ')');
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // Pagination
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const countRes = await query(`SELECT COUNT(*)::int AS total FROM ${table} ${whereSql}`, params);
    const total = countRes.rows[0].total;

    const rowsRes = await query(
      `SELECT * FROM ${table} ${whereSql} ORDER BY ${orderBy} LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    return ok(res, {
      items: rowsRes.rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    });
  });

  const getOne = asyncHandler(async (req, res) => {
    const { rows } = await query(`SELECT * FROM ${table} WHERE id = $1`, [req.params.id]);
    if (!rows.length) return fail(res, 'Record not found', 404);
    return ok(res, rows[0]);
  });

  const create = asyncHandler(async (req, res) => {
    const cols = columns.filter((c) => req.body[c] !== undefined);
    if (!cols.length) return fail(res, 'No valid fields provided', 400);
    const values = cols.map((c) => req.body[c]);
    const placeholders = cols.map((_, i) => `$${i + 1}`);
    const { rows } = await query(
      `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
      values
    );
    return created(res, rows[0]);
  });

  const update = asyncHandler(async (req, res) => {
    const cols = columns.filter((c) => req.body[c] !== undefined);
    if (!cols.length) return fail(res, 'No valid fields provided', 400);
    const set = cols.map((c, i) => `${c} = $${i + 1}`);
    const values = cols.map((c) => req.body[c]);
    values.push(req.params.id);
    const { rows } = await query(
      `UPDATE ${table} SET ${set.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (!rows.length) return fail(res, 'Record not found', 404);
    return ok(res, rows[0], 'Updated successfully');
  });

  const remove = asyncHandler(async (req, res) => {
    const { rowCount } = await query(`DELETE FROM ${table} WHERE id = $1`, [req.params.id]);
    if (!rowCount) return fail(res, 'Record not found', 404);
    return ok(res, {}, 'Deleted successfully');
  });

  return { list, getOne, create, update, remove };
}

module.exports = crudController;
