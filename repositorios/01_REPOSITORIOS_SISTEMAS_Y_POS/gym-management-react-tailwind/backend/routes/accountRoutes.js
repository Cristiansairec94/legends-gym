const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');
const c = require('../controllers/accountController');

// Every route here requires a logged-in user
router.use(authenticate);

router.get('/summary', c.summary);
router.post('/subscribe', c.subscribe);
router.post('/reviews', c.submitReview);

router.get('/photos', c.myPhotos);
router.post('/photos', upload.single('image'), c.uploadPhoto);
router.delete('/photos/:id', c.deletePhoto);

router.get('/cart', c.getCart);
router.put('/cart', c.saveCart);

module.exports = router;
