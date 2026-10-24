const router = require('express').Router();
const { requireAdmin } = require('../middleware/auth');
const c = require('../controllers/contentController');

router.get('/', c.getAll);                 // public
router.put('/', requireAdmin, c.updateBatch);

module.exports = router;
