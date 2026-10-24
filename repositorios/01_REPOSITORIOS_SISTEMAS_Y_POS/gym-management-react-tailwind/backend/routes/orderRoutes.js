const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { requireAdmin } = require('../middleware/auth');
const c = require('../controllers/orderController');

// Public checkout
router.post('/', [
  body('customer_name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('items').isArray({ min: 1 }).withMessage('Cart cannot be empty'),
  validate,
], c.create);

// Admin
router.get('/', requireAdmin, c.list);
router.get('/:id', requireAdmin, c.getOne);
router.patch('/:id/status', requireAdmin, c.updateStatus);

module.exports = router;
