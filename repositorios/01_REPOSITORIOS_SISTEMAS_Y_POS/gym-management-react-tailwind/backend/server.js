require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { pool } = require('./config/db');
const apiRoutes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// --- Core middleware -------------------------------------------------------
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Health check ----------------------------------------------------------
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ success: true, message: 'API healthy', data: { db: 'connected' } });
  } catch (err) {
    res.status(503).json({ success: false, message: 'Database unavailable' });
  }
});

// --- API routes ------------------------------------------------------------
app.use('/api', apiRoutes);

// --- 404 + error handling --------------------------------------------------
app.use(notFound);
app.use(errorHandler);

// --- Start -----------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`\n🏋️  IBBC API running on http://localhost:${PORT}`);
  console.log(`    Health: http://localhost:${PORT}/api/health\n`);
});

module.exports = app;
