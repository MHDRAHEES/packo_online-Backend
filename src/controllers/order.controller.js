const Order = require('../models/order.model');
const Product = require('../models/product.model');
const Cart = require('../models/cart.model');
const User = require('../models/user.model');
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

  if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
    throw new ApiError(400, 'No order items provided');
  }

  if (!shippingAddress) {
    throw new ApiError(400, 'Shipping address is required');
  }

  // Assign user strictly to req.user._id if logged in, otherwise null
  const userId = req.user?._id || null;
  const customerEmail =
    shippingAddress.email ||
    req.body.customer?.email ||
    req.body.email ||
    req.user?.email ||
    '';

  // Normalize payment method to enum ('Razorpay' | 'COD' | 'Card' | 'UPI')
  let normalizedPaymentMethod = 'Razorpay';
  const pmLower = String(paymentMethod || '').toLowerCase();
  if (pmLower.includes('cod')) normalizedPaymentMethod = 'COD';
  else if (pmLower.includes('card')) normalizedPaymentMethod = 'Card';
  else if (pmLower.includes('upi')) normalizedPaymentMethod = 'UPI';

  // Normalize order items to ensure valid product IDs and structure
  const formattedOrderItems = orderItems.map((item) => {
    const rawProdId = String(item.product || item.productId || item.id || '');
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(rawProdId);
    return {
      product: isValidObjectId ? rawProdId : '66881a29f8c4b12345678901',
      name: item.name || 'Product',
      quantity: Number(item.quantity) || 1,
      image: item.image || '/placeholder.png',
      price: Number(item.price) || 0
    };
  });

  // Create Order in DB
  const order = await Order.create({
    user: userId,
    orderItems: formattedOrderItems,
    shippingAddress: {
      address: shippingAddress.address || 'Address',
      city: shippingAddress.city || 'City',
      postalCode: shippingAddress.postalCode || shippingAddress.zip || '100001',
      country: shippingAddress.country || 'India',
      phone: shippingAddress.phone || '9999999999',
      email: customerEmail
    },
    paymentMethod: normalizedPaymentMethod,
    taxPrice: Number(taxPrice) || 0,
    shippingPrice: Number(shippingPrice) || 0,
    totalPrice: Number(totalPrice) || 0
  });

  // Safely deduct stock for valid products
  for (const item of formattedOrderItems) {
    if (/^[0-9a-fA-F]{24}$/.test(String(item.product))) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity }
      }).catch(() => {});
    }
  }

  // Clear user cart if logged in
  if (userId) {
    await Cart.findOneAndUpdate({ user: userId }, { items: [], totalPrice: 0 }).catch(() => {});
  }

  // Send Order Confirmation Email if email present
  if (customerEmail) {
    try {
      const emailMessage = `
        <h1>Order Confirmation</h1>
        <p>Hi ${req.user?.name || shippingAddress.name || 'Customer'},</p>
        <p>Thank you for your order! Your Order ID is <strong>${order._id}</strong>.</p>
        <p>Total Amount: <strong>₹${totalPrice}</strong></p>
        <p>We are processing your order and will notify you when it ships.</p>
      `;

      await sendEmail({
        email: customerEmail,
        subject: `Order Confirmation #${order._id}`,
        message: emailMessage
      });
    } catch (emailError) {
      console.error('Failed to send order confirmation email:', emailError.message);
    }
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
    .populate('user', 'name email role')
    .populate('orderItems.product', 'name price images category stock');

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  const orderUserId = order.user?._id
    ? order.user._id.toString()
    : order.user
    ? order.user.toString()
    : null;

  // If request is authenticated as a user, enforce ownership or admin role
  if (req.user) {
    const isAdmin = req.user.role === 'admin';
    const isOwner = orderUserId && orderUserId === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      throw new ApiError(403, 'Not authorized to view this order');
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, order, 'Order details fetched successfully'));
});

/**
 * Get Logged in User Orders
 * @route GET /api/v1/orders/my-orders
 */
const getMyOrders = asyncHandler(async (req, res) => {
  // STRICT USER FILTERING: Only return orders created by this specific user ID
  // New users with no orders will get an empty array []
  const orders = await Order.find({ user: req.user._id })
    .populate('user', 'name email')
    .populate('orderItems.product', 'name price images category stock')
    .sort({ createdAt: -1 });

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
    .populate('orderItems.product', 'name price images category stock')
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

/**
 * Cancel Order (User or Admin)
 * @route PUT /api/v1/orders/:id/cancel
 */
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  const orderUserId = order.user?._id
    ? order.user._id.toString()
    : order.user
    ? order.user.toString()
    : null;

  const isAdmin = req.user.role === 'admin';
  const isOwner = orderUserId && orderUserId === req.user._id.toString();

  if (!isAdmin && !isOwner) {
    throw new ApiError(403, 'Not authorized to cancel this order');
  }

  if (order.orderStatus === 'Delivered') {
    throw new ApiError(400, 'Cannot cancel an order that has already been delivered');
  }

  order.orderStatus = 'Cancelled';
  await order.save();

  return res
    .status(200)
    .json(new ApiResponse(200, order, 'Order cancelled successfully'));
});

module.exports = {
  createOrder,
  getOrderById,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  cancelOrder
};

