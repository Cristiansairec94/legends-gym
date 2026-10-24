const { fail } = require('../utils/response');
const multer = require('multer');

const notFound = (req, res) => fail(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // File-upload (multer) errors -> friendly 400
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE'
      ? 'Image is too large. Maximum size is 10 MB.'
      : `Upload error: ${err.message}`;
    return fail(res, msg, 400);
  }
  // Postgres unique-violation -> friendly 409
  if (err.code === '23505') {
    return fail(res, 'A record with these details already exists', 409);
  }
  // Postgres foreign-key violation
  if (err.code === '23503') {
    return fail(res, 'Related record not found or still referenced', 409);
  }
  if (process.env.NODE_ENV !== 'production') {
    console.error('[error]', err.message);
  }
  const status = err.status || 500;
  const message = status === 500 ? 'Internal server error' : err.message;
  return fail(res, message, status);
};

module.exports = { notFound, errorHandler };
