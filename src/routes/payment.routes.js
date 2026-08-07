const express = require('express');
const {
  createRazorpayOrder,
  verifyPayment
} = require('../controllers/payment.controller');
const { verifyJWT } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(verifyJWT);

router.post('/checkout', createRazorpayOrder);
router.post('/verify', verifyPayment);

module.exports = router;
