const express = require('express');
const crudController = require('../controllers/_crud');
const { requireAdmin } = require('../middleware/auth');

/**
 * Standard resource router.
 * Public: GET /  and GET /:id
 * Admin : POST / , PUT /:id , DELETE /:id
 */
module.exports = function crudRouter(cfg, { publicRead = true } = {}) {
  const router = express.Router();
  const ctrl = crudController(cfg);
  const readGuard = publicRead ? [] : [requireAdmin];
  router.get('/', ...readGuard, ctrl.list);
  router.get('/:id', ...readGuard, ctrl.getOne);
  router.post('/', requireAdmin, ctrl.create);
  router.put('/:id', requireAdmin, ctrl.update);
  router.delete('/:id', requireAdmin, ctrl.remove);
  return router;
};
