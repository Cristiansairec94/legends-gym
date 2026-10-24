const router = require('express').Router();
const { requireAdmin } = require('../middleware/auth');
const c = require('../controllers/dashboardController');

router.get('/', requireAdmin, c.stats);

module.exports = router;
