const Category = require('../models/category.model');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Get all categories
 * @route GET /api/v1/categories
 */
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find();
  return res
    .status(200)
    .json(new ApiResponse(200, categories, 'Categories fetched successfully'));
});

/**
 * Get single category by ID or slug
 * @route GET /api/v1/categories/:id
 */
const getCategoryById = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    throw new ApiError(404, 'Category not found');
  }
  return res
    .status(200)
    .json(new ApiResponse(200, category, 'Category details fetched'));
});

/**
 * Create category (Admin Only)
 * @route POST /api/v1/categories
 */
const createCategory = asyncHandler(async (req, res) => {
  const { name, description, image } = req.body;
  if (!name) {
    throw new ApiError(400, 'Category name is required');
  }

  const existing = await Category.findOne({ name });
  if (existing) {
    throw new ApiError(409, 'Category with this name already exists');
  }

  const category = await Category.create({ name, description, image });
  return res
    .status(201)
    .json(new ApiResponse(201, category, 'Category created successfully'));
});

/**
 * Update category (Admin Only)
 * @route PUT /api/v1/categories/:id
 */
const updateCategory = asyncHandler(async (req, res) => {
  const { name, description, image } = req.body;
  const category = await Category.findByIdAndUpdate(
    req.params.id,
    { name, description, image },
    { new: true, runValidators: true }
  );

  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, category, 'Category updated successfully'));
});

/**
 * Delete category (Admin Only)
 * @route DELETE /api/v1/categories/:id
 */
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) {
    throw new ApiError(404, 'Category not found');
  }
  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Category deleted successfully'));
});

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};
