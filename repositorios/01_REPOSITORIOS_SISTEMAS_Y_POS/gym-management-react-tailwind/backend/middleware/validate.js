const { validationResult } = require('express-validator');
const { fail } = require('../utils/response');

// Collects express-validator errors into a consistent 422 response.
const validate = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
    return fail(res, 'Validation failed', 422, errors);
  }
  return next();
};

module.exports = validate;
