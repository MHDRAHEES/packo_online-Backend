const express = require('express');
const {
  getCart,
  addToCart,
  updateCartItemQuantity,
  removeFromCart,
  clearCart
} = require('../controllers/cart.controller');
const { verifyJWT } = require('../middlewares/auth.middleware');

const router = express.Router();

// All cart routes require authentication
router.use(verifyJWT);

router.get('/', getCart);
router.post('/', addToCart);
router.put('/item', updateCartItemQuantity);
router.delete('/item/:productId', removeFromCart);
router.delete('/', clearCart);

module.exports = router;
