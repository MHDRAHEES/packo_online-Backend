const express = require('express');
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductReview
} = require('../controllers/product.controller');
const { verifyJWT, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', getProducts);
router.get('/:id', getProductById);

// Authenticated Customer Routes
router.post('/:id/reviews', verifyJWT, createProductReview);

// Admin Only Routes
router.post('/', verifyJWT, authorizeRoles('admin'), createProduct);
router.put('/:id', verifyJWT, authorizeRoles('admin'), updateProduct);
router.delete('/:id', verifyJWT, authorizeRoles('admin'), deleteProduct);

module.exports = router;
