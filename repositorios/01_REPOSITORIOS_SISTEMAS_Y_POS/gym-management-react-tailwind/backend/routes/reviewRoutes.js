const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { requireAdmin } = require('../middleware/auth');
const c = require('../controllers/reviewController');

router.get('/', c.list);   // public approved
router.post('/', [
  body('customer_name').trim().notEmpty(),
  body('message').trim().notEmpty(),
  validate,
], c.create);

router.patch('/:id/approve', requireAdmin, c.setApproval);
router.put('/:id', requireAdmin, c.update);
router.delete('/:id', requireAdmin, c.remove);

module.exports = router;
