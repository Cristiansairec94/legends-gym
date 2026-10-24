const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { requireAdmin } = require('../middleware/auth');
const c = require('../controllers/planController');

router.get('/', c.list);          // public
router.get('/:id', c.getOne);     // public
router.post('/', requireAdmin, [
  body('name').trim().notEmpty(),
  body('price').isFloat({ min: 0 }),
  body('duration_months').isInt({ min: 1 }),
  validate,
], c.create);
router.put('/:id', requireAdmin, c.update);
router.delete('/:id', requireAdmin, c.remove);

module.exports = router;
