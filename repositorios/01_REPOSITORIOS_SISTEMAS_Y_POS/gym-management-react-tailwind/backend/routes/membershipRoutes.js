const router = require('express').Router();
const { requireAdmin } = require('../middleware/auth');
const c = require('../controllers/membershipController');

router.get('/', requireAdmin, c.list);
router.post('/', requireAdmin, c.create);
router.patch('/:id/status', requireAdmin, c.updateStatus);
router.delete('/:id', requireAdmin, c.remove);

module.exports = router;
