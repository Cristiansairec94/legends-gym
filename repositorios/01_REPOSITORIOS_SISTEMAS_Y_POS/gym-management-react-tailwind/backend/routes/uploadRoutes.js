const router = require('express').Router();
const { requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { ok, fail } = require('../utils/response');

// POST /api/upload  (admin) — returns a public URL for the stored image
router.post('/', requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) return fail(res, 'No file uploaded', 400);
  // Relative path — served by the backend at /uploads and proxied by Nginx,
  // so it works the same in Docker and local dev regardless of host/port.
  const url = `/uploads/${req.file.filename}`;
  return ok(res, { url, filename: req.file.filename }, 'File uploaded');
});

module.exports = router;
