const router = require('express').Router();
const { requireAdmin } = require('../middleware/auth');
const c = require('../controllers/paymentController');

router.get('/', requireAdmin, c.list);
router.post('/', requireAdmin, c.create);
router.put('/:id', requireAdmin, c.update);
router.delete('/:id', requireAdmin, c.remove);

module.exports = router;
