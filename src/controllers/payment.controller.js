const crypto = require('crypto');
const razorpayInstance = require('../config/razorpay');
const Order = require('../models/order.model');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Create Razorpay Order
 * @route POST /api/v1/payment/checkout
 */
const createRazorpayOrder = asyncHandler(async (req, res) => {
  const { amount, currency = 'INR', orderId } = req.body;

  if (!amount) {
    throw new ApiError(400, 'Amount is required for Razorpay checkout');
  }

  const options = {
    amount: Math.round(amount * 100), // amount in paise
    currency,
    receipt: `receipt_${orderId || Date.now()}`
  };

  const razorpayOrder = await razorpayInstance.orders.create(options);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        id: razorpayOrder.id,
        currency: razorpayOrder.currency,
        amount: razorpayOrder.amount,
        key: process.env.RAZORPAY_KEY_ID
      },
      'Razorpay order created successfully'
    )
  );
});

/**
 * Verify Razorpay Payment Signature
 * @route POST /api/v1/payment/verify
 */
const verifyPayment = asyncHandler(async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    orderId
  } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new ApiError(400, 'Invalid payment verification parameters');
  }

  const body = razorpay_order_id + '|' + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'dummy_key_secret')
    .update(body.toString())
    .digest('hex');

  const isAuthentic = expectedSignature === razorpay_signature;

  if (isAuthentic) {
    // Update order status if orderId provided
    if (orderId) {
      const order = await Order.findById(orderId);
      if (order) {
        order.isPaid = true;
        order.paidAt = Date.now();
        order.paymentResult = {
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          status: 'COMPLETED'
        };
        await order.save();
      }
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        { razorpay_payment_id },
        'Payment verified successfully'
      )
    );
  } else {
    throw new ApiError(400, 'Payment verification failed: Signature mismatch');
  }
});

module.exports = {
  createRazorpayOrder,
  verifyPayment
};
