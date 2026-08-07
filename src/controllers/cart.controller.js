const Cart = require('../models/cart.model');
const Product = require('../models/product.model');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Get User Cart
 * @route GET /api/v1/cart
 */
const getCart = asyncHandler(async (req, res) => {
  let cart = await Cart.findOne({ user: req.user._id }).populate(
    'items.product',
    'name price images stock'
  );

  if (!cart) {
    cart = await Cart.create({ user: req.user._id, items: [], totalPrice: 0 });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, cart, 'User cart fetched successfully'));
});

/**
 * Add item to cart
 * @route POST /api/v1/cart
 */
const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  if (product.stock < quantity) {
    throw new ApiError(400, 'Product out of stock or requested quantity exceeds available stock');
  }

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    cart = new Cart({ user: req.user._id, items: [] });
  }

  const existingItemIndex = cart.items.findIndex(
    (item) => item.product.toString() === productId
  );

  if (existingItemIndex > -1) {
    cart.items[existingItemIndex].quantity += Number(quantity);
  } else {
    cart.items.push({
      product: productId,
      quantity: Number(quantity),
      price: product.discountPrice > 0 ? product.discountPrice : product.price
    });
  }

  await cart.save();

  const updatedCart = await Cart.findById(cart._id).populate(
    'items.product',
    'name price images stock'
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedCart, 'Item added to cart'));
});

/**
 * Update cart item quantity
 * @route PUT /api/v1/cart/item
 */
const updateCartItemQuantity = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;

  if (quantity < 1) {
    throw new ApiError(400, 'Quantity must be at least 1');
  }

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    throw new ApiError(404, 'Cart not found');
  }

  const itemIndex = cart.items.findIndex(
    (item) => item.product.toString() === productId
  );

  if (itemIndex === -1) {
    throw new ApiError(404, 'Item not found in cart');
  }

  cart.items[itemIndex].quantity = Number(quantity);
  await cart.save();

  const updatedCart = await Cart.findById(cart._id).populate(
    'items.product',
    'name price images stock'
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedCart, 'Cart quantity updated'));
});

/**
 * Remove item from cart
 * @route DELETE /api/v1/cart/item/:productId
 */
const removeFromCart = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    throw new ApiError(404, 'Cart not found');
  }

  cart.items = cart.items.filter(
    (item) => item.product.toString() !== productId
  );

  await cart.save();

  const updatedCart = await Cart.findById(cart._id).populate(
    'items.product',
    'name price images stock'
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedCart, 'Item removed from cart'));
});

/**
 * Clear cart
 * @route DELETE /api/v1/cart
 */
const clearCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (cart) {
    cart.items = [];
    cart.totalPrice = 0;
    await cart.save();
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { items: [], totalPrice: 0 }, 'Cart cleared'));
});

module.exports = {
  getCart,
  addToCart,
  updateCartItemQuantity,
  removeFromCart,
  clearCart
};
