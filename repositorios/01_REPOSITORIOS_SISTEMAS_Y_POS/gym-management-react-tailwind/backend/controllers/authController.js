const bcrypt = require('bcryptjs');
const { query, getClient } = require('../config/db');
const { ok, created, fail } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/token');
const { memberCode } = require('../utils/codes');

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

/** POST /api/auth/register — self-service member signup (creates user + member profile) */
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  const exists = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (exists.rows.length) return fail(res, 'Email is already registered', 409);

  const hash = await bcrypt.hash(password, 10);
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const userRes = await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'member') RETURNING *`,
      [name, email, hash]
    );
    const user = userRes.rows[0];

    const memberRes = await client.query(
      `INSERT INTO members (user_id, full_name, email, phone, status)
       VALUES ($1, $2, $3, $4, 'pending') RETURNING id`,
      [user.id, name, email, phone || null]
    );
    await client.query('UPDATE members SET member_code = $1 WHERE id = $2', [
      memberCode(memberRes.rows[0].id),
      memberRes.rows[0].id,
    ]);
    await client.query('COMMIT');

    const token = signToken(publicUser(user));
    return created(res, { token, user: publicUser(user) }, 'Registration successful');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

/** POST /api/auth/login — member/general login */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];
  if (!user || !user.is_active) return fail(res, 'Invalid credentials', 401);

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return fail(res, 'Invalid credentials', 401);

  const token = signToken(publicUser(user));
  return ok(res, { token, user: publicUser(user) }, 'Login successful');
});

/** POST /api/auth/admin/login — admins only */
const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await query("SELECT * FROM users WHERE email = $1 AND role = 'admin'", [email]);
  const user = rows[0];
  if (!user || !user.is_active) return fail(res, 'Invalid admin credentials', 401);

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return fail(res, 'Invalid admin credentials', 401);

  const token = signToken(publicUser(user));
  return ok(res, { token, user: publicUser(user) }, 'Admin login successful');
});

/** GET /api/auth/me — current user + member profile if any */
const me = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT id, name, email, role FROM users WHERE id = $1', [req.user.id]);
  if (!rows.length) return fail(res, 'User not found', 404);
  const user = rows[0];
  let member = null;
  if (user.role === 'member') {
    const m = await query('SELECT * FROM members WHERE user_id = $1', [user.id]);
    member = m.rows[0] || null;
  }
  return ok(res, { user, member });
});

module.exports = { register, login, adminLogin, me };
