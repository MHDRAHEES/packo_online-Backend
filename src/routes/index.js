const express = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const categoryRoutes = require('./category.routes');
const productRoutes = require('./product.routes');
const cartRoutes = require('./cart.routes');
const orderRoutes = require('./order.routes');
const uploadRoutes = require('./upload.routes');
const paymentRoutes = require('./payment.routes');

const router = express.Router();

// Feature Route Mounts
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/upload', uploadRoutes);
router.use('/payment', paymentRoutes);

module.exports = router;
