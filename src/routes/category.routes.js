const express = require('express');
const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/category.controller');
const { verifyJWT, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', getCategories);
router.get('/:id', getCategoryById);

// Admin Only Routes
router.post('/', verifyJWT, authorizeRoles('admin'), createCategory);
router.put('/:id', verifyJWT, authorizeRoles('admin'), updateCategory);
router.delete('/:id', verifyJWT, authorizeRoles('admin'), deleteCategory);

module.exports = router;
