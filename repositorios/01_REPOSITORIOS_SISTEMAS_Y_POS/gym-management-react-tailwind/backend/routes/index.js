const router = require('express').Router();

router.use('/auth', require('./authRoutes'));
router.use('/account', require('./accountRoutes'));
router.use('/members', require('./memberRoutes'));
router.use('/plans', require('./planRoutes'));
router.use('/memberships', require('./membershipRoutes'));
router.use('/payments', require('./paymentRoutes'));
router.use('/trainers', require('./trainerRoutes'));
router.use('/services', require('./serviceRoutes'));
router.use('/facilities', require('./facilityRoutes'));
router.use('/appointments', require('./appointmentRoutes'));
router.use('/products', require('./productRoutes'));
router.use('/categories', require('./categoryRoutes'));
router.use('/orders', require('./orderRoutes'));
router.use('/reviews', require('./reviewRoutes'));
router.use('/gallery', require('./galleryRoutes'));
router.use('/enquiries', require('./enquiryRoutes'));
router.use('/content', require('./contentRoutes'));
router.use('/banners', require('./bannerRoutes'));
router.use('/dashboard', require('./dashboardRoutes'));
router.use('/upload', require('./uploadRoutes'));

module.exports = router;
