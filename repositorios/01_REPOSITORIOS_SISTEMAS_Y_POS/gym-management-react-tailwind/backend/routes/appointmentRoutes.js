const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { requireAdmin } = require('../middleware/auth');
const c = require('../controllers/appointmentController');

router.post('/', [
  body('customer_name').trim().notEmpty(),
  body('email').isEmail(),
  body('appointment_date').notEmpty(),
  body('appointment_time').notEmpty(),
  validate,
], c.create);

router.get('/', requireAdmin, c.list);
router.patch('/:id/status', requireAdmin, c.updateStatus);
router.delete('/:id', requireAdmin, c.remove);

module.exports = router;
