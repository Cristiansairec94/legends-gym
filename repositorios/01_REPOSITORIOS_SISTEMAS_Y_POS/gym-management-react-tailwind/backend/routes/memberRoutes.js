const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { requireAdmin } = require('../middleware/auth');
const c = require('../controllers/memberController');

// Public membership registration
router.post('/register', [
  body('full_name').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('plan_id').isInt().withMessage('Please select a plan'),
  validate,
], c.registerMembership);

// Admin
router.get('/', requireAdmin, c.list);
router.post('/refresh-status', requireAdmin, c.refreshStatuses);
router.get('/:id', requireAdmin, c.getOne);
router.post('/', requireAdmin, c.create);
router.put('/:id', requireAdmin, c.update);
router.delete('/:id', requireAdmin, c.remove);

module.exports = router;
