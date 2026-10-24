// Consistent JSON envelopes for every response.
const ok = (res, data = {}, message = 'OK', status = 200) =>
  res.status(status).json({ success: true, message, data });

const created = (res, data = {}, message = 'Created successfully') =>
  ok(res, data, message, 201);

const fail = (res, message = 'Something went wrong', status = 400, errors = null) =>
  res.status(status).json({ success: false, message, ...(errors ? { errors } : {}) });

module.exports = { ok, created, fail };
