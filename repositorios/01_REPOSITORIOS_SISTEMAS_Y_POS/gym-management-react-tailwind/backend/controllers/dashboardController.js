const { query } = require('../config/db');
const { ok } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

/** GET /api/dashboard (admin) — every number computed from the DB, none hardcoded */
const stats = asyncHandler(async (req, res) => {
  const [
    members, membersByStatus, orders, ordersPending, revenue, upcoming,
    recentMembers, recentOrders, productsLow,
  ] = await Promise.all([
    query('SELECT COUNT(*)::int AS c FROM members'),
    query("SELECT status, COUNT(*)::int AS c FROM members GROUP BY status"),
    query('SELECT COUNT(*)::int AS c FROM orders'),
    query("SELECT COUNT(*)::int AS c FROM orders WHERE status = 'pending'"),
    query(`SELECT COALESCE(SUM(amount),0)::float AS total
           FROM payments
           WHERE status = 'paid'
             AND date_trunc('month', COALESCE(paid_at::timestamptz, created_at)) = date_trunc('month', CURRENT_DATE)`),
    query(`SELECT COUNT(*)::int AS c FROM appointments
           WHERE appointment_date >= CURRENT_DATE AND status IN ('pending','confirmed')`),
    query('SELECT id, full_name, email, member_code, status, created_at FROM members ORDER BY created_at DESC LIMIT 5'),
    query('SELECT id, order_code, customer_name, total_amount, status, created_at FROM orders ORDER BY created_at DESC LIMIT 5'),
    query('SELECT COUNT(*)::int AS c FROM products WHERE stock < 10 AND is_active = TRUE'),
  ]);

  const statusMap = { active: 0, expired: 0, pending: 0, cancelled: 0 };
  membersByStatus.rows.forEach((r) => { statusMap[r.status] = r.c; });

  // last 7 days orders count for a mini trend
  const trend = await query(`
    SELECT to_char(d.day, 'Mon DD') AS label,
           COALESCE(o.c, 0)::int AS value
    FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day') AS d(day)
    LEFT JOIN (
      SELECT date_trunc('day', created_at) AS day, COUNT(*) AS c
      FROM orders GROUP BY 1
    ) o ON o.day = d.day
    ORDER BY d.day`);

  return ok(res, {
    totals: {
      members: members.rows[0].c,
      active_members: statusMap.active,
      expired_memberships: statusMap.expired,
      pending_memberships: statusMap.pending,
      total_orders: orders.rows[0].c,
      pending_orders: ordersPending.rows[0].c,
      monthly_revenue: revenue.rows[0].total,
      upcoming_appointments: upcoming.rows[0].c,
      low_stock_products: productsLow.rows[0].c,
    },
    recent_members: recentMembers.rows,
    recent_orders: recentOrders.rows,
    order_trend: trend.rows,
  });
});

module.exports = { stats };
