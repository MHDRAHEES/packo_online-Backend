const express = require('express');
const {
  createOrder,
  getOrderById,
  getMyOrders,
  getAllOrders,
  updateOrderStatus
} = require('../controllers/order.controller');
const { verifyJWT, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(verifyJWT);

router.post('/', createOrder);
router.get('/my-orders', getMyOrders);
router.get('/:id', getOrderById);

// Admin Only Routes
router.get('/', authorizeRoles('admin'), getAllOrders);
router.put('/:id/status', authorizeRoles('admin'), updateOrderStatus);

module.exports = router;
