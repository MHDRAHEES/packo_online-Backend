const express = require('express');
const {
  createOrder,
  getOrderById,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  cancelOrder
} = require('../controllers/order.controller');
const { verifyJWT, optionalJWT, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

// Allow guest or authenticated user to create order
router.post('/', optionalJWT, createOrder);

// Authenticated or Guest Order Details (optionalJWT enables guest confirmation view & user view)
router.get('/my-orders', verifyJWT, getMyOrders);
router.get('/:id', optionalJWT, getOrderById);
router.put('/:id/cancel', verifyJWT, cancelOrder);

// Admin Only Routes
router.get('/', verifyJWT, authorizeRoles('admin'), getAllOrders);
router.put('/:id/status', verifyJWT, authorizeRoles('admin'), updateOrderStatus);

module.exports = router;
