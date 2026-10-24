const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { requireAdmin } = require('../middleware/auth');
const c = require('../controllers/productController');

router.get('/', c.list);        // public storefront
router.get('/:id', c.getOne);   // public detail
router.post('/', requireAdmin, [
  body('name').trim().notEmpty(),
  body('price').isFloat({ min: 0 }),
  validate,
], c.create);
router.put('/:id', requireAdmin, c.update);
router.delete('/:id', requireAdmin, c.remove);

module.exports = router;
