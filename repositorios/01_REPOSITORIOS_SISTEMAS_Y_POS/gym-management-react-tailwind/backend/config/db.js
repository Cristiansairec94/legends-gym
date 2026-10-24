const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Enable SSL automatically for hosted databases (Neon/Render/Heroku etc.)
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=require')
    ? { rejectUnauthorized: false }
    : false,
});

pool.on('connect', () => {
  if (process.env.NODE_ENV !== 'production') {
    // Single confirmation, not per-query noise
  }
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

/**
 * Run a parameterized query. NEVER interpolate user input into `text`.
 * @param {string} text  SQL with $1, $2 placeholders
 * @param {Array}  params
 */
const query = (text, params) => pool.query(text, params);

/** Acquire a client for transactions (BEGIN/COMMIT/ROLLBACK). */
const getClient = () => pool.connect();

module.exports = { pool, query, getClient };
