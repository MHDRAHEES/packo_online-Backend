const Order = require('../models/order.model');
const Product = require('../models/product.model');
const Cart = require('../models/cart.model');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const sendEmail = require('../utils/sendEmail');

/**
 * Create New Order
 * @route POST /api/v1/orders
 */
const createOrder = asyncHandler(async (req, res) => {
  const {
    orderItems,
    shippingAddress,
    paymentMethod,
    taxPrice = 0,
    shippingPrice = 0,
    totalPrice
  } = req.body;

  if (!orderItems || orderItems.length === 0) {
    throw new ApiError(400, 'No order items provided');
  }

  if (!shippingAddress) {
    throw new ApiError(400, 'Shipping address is required');
  }

  // Create Order
  const order = await Order.create({
    user: req.user._id,
    orderItems,
    shippingAddress,
    paymentMethod,
    taxPrice,
    shippingPrice,
    totalPrice
  });

  // Deduct stock for each product
  for (const item of orderItems) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: -item.quantity }
    });
  }

  // Clear user cart
  await Cart.findOneAndUpdate({ user: req.user._id }, { items: [], totalPrice: 0 });

  // Send Order Confirmation Email
  try {
    const emailMessage = `
      <h1>Order Confirmation</h1>
      <p>Hi ${req.user.name},</p>
      <p>Thank you for your order! Your Order ID is <strong>${order._id}</strong>.</p>
      <p>Total Amount: <strong>₹${totalPrice}</strong></p>
      <p>We are processing your order and will notify you when it ships.</p>
    `;

    await sendEmail({
      email: req.user.email,
      subject: `Order Confirmation #${order._id}`,
      message: emailMessage
    });
  } catch (emailError) {
    console.error('Failed to send order confirmation email:', emailError.message);
  }

  return res
    .status(201)
    .json(new ApiResponse(201, order, 'Order created successfully'));
});

/**
 * Get Order Details by ID
 * @route GET /api/v1/orders/:id
 */
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'name email')
    .populate('orderItems.product', 'name price images');

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // Ensure user owns order or is admin
  if (
    order.user._id.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    throw new ApiError(403, 'Not authorized to view this order');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, order, 'Order details fetched'));
});

/**
 * Get Logged in User Orders
 * @route GET /api/v1/orders/my-orders
 */
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({
    createdAt: -1
  });
  return res
    .status(200)
    .json(new ApiResponse(200, orders, 'User orders fetched successfully'));
});

/**
 * Get All Orders (Admin Only)
 * @route GET /api/v1/orders
 */
const getAllOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find()
    .populate('user', 'name email')
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, orders, 'All orders fetched for admin'));
});

/**
 * Update Order Status (Admin Only)
 * @route PUT /api/v1/orders/:id/status
 */
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  order.orderStatus = status;
  if (status === 'Delivered') {
    order.isDelivered = true;
    order.deliveredAt = Date.now();
  }

  await order.save();

  return res
    .status(200)
    .json(new ApiResponse(200, order, 'Order status updated successfully'));
});

module.exports = {
  createOrder,
  getOrderById,
  getMyOrders,
  getAllOrders,
  updateOrderStatus
};
