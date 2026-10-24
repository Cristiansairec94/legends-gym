const { query, getClient } = require('../config/db');
const { ok, created, fail } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const { orderCode } = require('../utils/codes');

/**
 * POST /api/orders  (public checkout)
 * body: { customer_name, email, phone, address, notes, items: [{ product_id, quantity }] }
 * Validates stock and decrements it atomically. No fake payment — order starts 'pending'.
 */
const create = asyncHandler(async (req, res) => {
  const { customer_name, email, phone, address, notes, items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return fail(res, 'Cart is empty', 400);
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    let total = 0;
    const resolved = [];

    for (const item of items) {
      const qty = parseInt(item.quantity, 10);
      if (!qty || qty < 1) throw Object.assign(new Error('Invalid quantity'), { status: 400 });

      // Lock the product row to prevent oversell under concurrency
      const prodRes = await client.query(
        'SELECT * FROM products WHERE id = $1 AND is_active = TRUE FOR UPDATE',
        [item.product_id]
      );
      if (!prodRes.rows.length) {
        throw Object.assign(new Error(`Product ${item.product_id} not available`), { status: 400 });
      }
      const product = prodRes.rows[0];
      if (product.stock < qty) {
        throw Object.assign(new Error(`Insufficient stock for ${product.name} (left: ${product.stock})`), { status: 409 });
      }
      const unitPrice = Number(product.sale_price ?? product.price);
      const lineTotal = unitPrice * qty;
      total += lineTotal;
      resolved.push({ product, qty, unitPrice, lineTotal });
    }

    // Link to member profile if this email belongs to one
    const memberRes = await client.query('SELECT id FROM members WHERE email = $1 LIMIT 1', [email]);
    const memberId = memberRes.rows[0]?.id || null;

    const orderRes = await client.query(
      `INSERT INTO orders (order_code, member_id, customer_name, email, phone, address, total_amount, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8) RETURNING *`,
      [orderCode(), memberId, customer_name, email, phone || null, address || null, total, notes || null]
    );
    const order = orderRes.rows[0];

    for (const r of resolved) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [order.id, r.product.id, r.product.name, r.unitPrice, r.qty, r.lineTotal]
      );
      await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [r.qty, r.product.id]);
    }

    await client.query('COMMIT');
    return created(res, { order, items: resolved.map((r) => ({ name: r.product.name, quantity: r.qty, line_total: r.lineTotal })) }, 'Order placed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

/** GET /api/orders (admin) */
const list = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const where = [];
  const params = [];
  if (status) { params.push(status); where.push(`status = $${params.length}`); }
  if (search) { params.push(`%${search}%`); where.push(`(customer_name ILIKE $${params.length} OR order_code ILIKE $${params.length} OR email ILIKE $${params.length})`); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const countRes = await query(`SELECT COUNT(*)::int AS total FROM orders ${whereSql}`, params);
  const rowsRes = await query(
    `SELECT * FROM orders ${whereSql} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
    params
  );
  return ok(res, {
    items: rowsRes.rows,
    pagination: { page, limit, total: countRes.rows[0].total, pages: Math.ceil(countRes.rows[0].total / limit) || 1 },
  });
});

const getOne = asyncHandler(async (req, res) => {
  const orderRes = await query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
  if (!orderRes.rows.length) return fail(res, 'Order not found', 404);
  const itemsRes = await query('SELECT * FROM order_items WHERE order_id = $1', [req.params.id]);
  return ok(res, { order: orderRes.rows[0], items: itemsRes.rows });
});

/** PATCH /api/orders/:id/status — cancelling restocks products */
const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const valid = ['pending', 'confirmed', 'processing', 'completed', 'cancelled'];
  if (!valid.includes(status)) return fail(res, 'Invalid status', 400);

  const client = await getClient();
  try {
    await client.query('BEGIN');
    const current = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!current.rows.length) { await client.query('ROLLBACK'); return fail(res, 'Order not found', 404); }

    const order = current.rows[0];
    // Restock only when moving INTO cancelled from a non-cancelled state
    if (status === 'cancelled' && order.status !== 'cancelled') {
      const items = await client.query('SELECT product_id, quantity FROM order_items WHERE order_id = $1', [order.id]);
      for (const it of items.rows) {
        if (it.product_id) {
          await client.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [it.quantity, it.product_id]);
        }
      }
    }
    const upd = await client.query('UPDATE orders SET status = $1 WHERE id = $2 RETURNING *', [status, order.id]);
    await client.query('COMMIT');
    return ok(res, upd.rows[0], 'Order status updated');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

module.exports = { create, list, getOne, updateStatus };
