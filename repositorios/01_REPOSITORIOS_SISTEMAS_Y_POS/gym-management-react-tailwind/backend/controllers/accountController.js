const { query, getClient } = require('../config/db');
const { ok, created, fail } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const { memberCode } = require('../utils/codes');

/** Resolve (or lazily create) the member profile for the logged-in user. */
async function ensureMember(user) {
  const existing = await query('SELECT * FROM members WHERE user_id = $1', [user.id]);
  if (existing.rows.length) return existing.rows[0];
  // Create a profile on the fly for accounts that don't have one yet
  const ins = await query(
    `INSERT INTO members (user_id, full_name, email, status)
     VALUES ($1,$2,$3,'pending') RETURNING *`,
    [user.id, user.name, user.email]
  );
  await query('UPDATE members SET member_code = $1 WHERE id = $2', [memberCode(ins.rows[0].id), ins.rows[0].id]);
  const again = await query('SELECT * FROM members WHERE id = $1', [ins.rows[0].id]);
  return again.rows[0];
}

/** GET /api/account/summary — the logged-in member's dashboard data */
const summary = asyncHandler(async (req, res) => {
  const member = await ensureMember(req.user);

  const [memberships, payments, orders, photos, reviews] = await Promise.all([
    query('SELECT * FROM memberships WHERE member_id = $1 ORDER BY start_date DESC', [member.id]),
    query('SELECT * FROM payments WHERE member_id = $1 ORDER BY created_at DESC', [member.id]),
    query('SELECT * FROM orders WHERE member_id = $1 ORDER BY created_at DESC', [member.id]),
    query('SELECT * FROM gallery_images WHERE member_id = $1 ORDER BY created_at DESC', [member.id]),
    query('SELECT * FROM reviews WHERE member_id = $1 ORDER BY created_at DESC', [member.id]),
  ]);

  // "current" membership = the latest active/pending one with the furthest end date
  const current =
    memberships.rows.find((m) => m.status === 'active') ||
    memberships.rows.find((m) => m.status === 'pending') ||
    memberships.rows[0] || null;

  return ok(res, {
    member,
    current_membership: current,
    memberships: memberships.rows,
    payments: payments.rows,
    orders: orders.rows,
    photos: photos.rows,
    reviews: reviews.rows,
  });
});

/** POST /api/account/subscribe — member picks a plan (creates pending membership + payment) */
const subscribe = asyncHandler(async (req, res) => {
  const member = await ensureMember(req.user);
  const { plan_id, start_date } = req.body;

  const planRes = await query('SELECT * FROM membership_plans WHERE id = $1 AND is_active = TRUE', [plan_id]);
  if (!planRes.rows.length) return fail(res, 'Selected plan is not available', 400);
  const plan = planRes.rows[0];

  const start = start_date ? new Date(start_date) : new Date();
  const end = new Date(start);
  end.setMonth(end.getMonth() + plan.duration_months);

  const client = await getClient();
  try {
    await client.query('BEGIN');
    const ms = await client.query(
      `INSERT INTO memberships (member_id, plan_id, plan_name, price, start_date, end_date, status)
       VALUES ($1,$2,$3,$4,$5,$6,'pending') RETURNING *`,
      [member.id, plan.id, plan.name, plan.price,
       start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)]
    );
    await client.query(
      `INSERT INTO payments (member_id, membership_id, amount, method, status)
       VALUES ($1,$2,$3,'cash','pending')`,
      [member.id, ms.rows[0].id, plan.price]
    );
    await client.query('COMMIT');
    return created(res, ms.rows[0], 'Plan requested. Our team will confirm your payment to activate it.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

/** POST /api/account/reviews — logged-in member leaves a review (pending approval) */
const submitReview = asyncHandler(async (req, res) => {
  const member = await ensureMember(req.user);
  const { rating, message, role_label } = req.body;
  if (!message || !String(message).trim()) return fail(res, 'Review message is required', 400);

  const { rows } = await query(
    `INSERT INTO reviews (member_id, customer_name, role_label, rating, message, is_approved)
     VALUES ($1,$2,$3,$4,$5, FALSE) RETURNING *`,
    [member.id, member.full_name, role_label || 'Member', Math.min(5, Math.max(1, Number(rating) || 5)), message]
  );
  return created(res, rows[0], 'Thanks! Your review will appear after approval.');
});

/** GET /api/account/photos — this member's uploaded photos */
const myPhotos = asyncHandler(async (req, res) => {
  const member = await ensureMember(req.user);
  const { rows } = await query('SELECT * FROM gallery_images WHERE member_id = $1 ORDER BY created_at DESC', [member.id]);
  return ok(res, { items: rows });
});

/** POST /api/account/photos — member uploads a gym photo (multipart 'image'), pending approval */
const uploadPhoto = asyncHandler(async (req, res) => {
  const member = await ensureMember(req.user);
  if (!req.file) return fail(res, 'No image uploaded', 400);
  const url = `/uploads/${req.file.filename}`;
  const title = (req.body.title || `${member.full_name}'s photo`).slice(0, 120);
  const { rows } = await query(
    `INSERT INTO gallery_images (title, category, image_url, member_id, is_active)
     VALUES ($1, 'Members', $2, $3, FALSE) RETURNING *`,
    [title, url, member.id]
  );
  return created(res, rows[0], 'Photo uploaded! It will appear in the gallery once approved.');
});

/** DELETE /api/account/photos/:id — member removes their own (still-pending) photo */
const deletePhoto = asyncHandler(async (req, res) => {
  const member = await ensureMember(req.user);
  const { rowCount } = await query('DELETE FROM gallery_images WHERE id = $1 AND member_id = $2', [req.params.id, member.id]);
  if (!rowCount) return fail(res, 'Photo not found', 404);
  return ok(res, {}, 'Photo removed');
});

/** GET /api/account/cart — the user's saved cart */
const getCart = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT data FROM carts WHERE user_id = $1', [req.user.id]);
  return ok(res, { items: rows[0]?.data || [] });
});

/** PUT /api/account/cart — persist the user's cart (accessible from anywhere) */
const saveCart = asyncHandler(async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  await query(
    `INSERT INTO carts (user_id, data) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data`,
    [req.user.id, JSON.stringify(items)]
  );
  return ok(res, { items }, 'Cart saved');
});

module.exports = {
  summary, subscribe, submitReview,
  myPhotos, uploadPhoto, deletePhoto,
  getCart, saveCart,
};
