const Product = require('../models/product.model');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Get all products with search, filter, sorting, and pagination
 * @route GET /api/v1/products
 */
const getProducts = asyncHandler(async (req, res) => {
  const { keyword, category, minPrice, maxPrice, rating, sort, page = 1, limit = 10 } = req.query;

  const query = {};

  // Search keyword (name or description)
  if (keyword) {
    query.$or = [
      { name: { $regex: keyword, $options: 'i' } },
      { description: { $regex: keyword, $options: 'i' } }
    ];
  }

  // Filter by category
  if (category) {
    query.category = category;
  }

  // Filter by price range
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  // Filter by minimum rating
  if (rating) {
    query.ratings = { $gte: Number(rating) };
  }

  // Sorting
  let sortOption = { createdAt: -1 };
  if (sort === 'price_asc') sortOption = { price: 1 };
  if (sort === 'price_desc') sortOption = { price: -1 };
  if (sort === 'rating') sortOption = { ratings: -1 };
  if (sort === 'latest') sortOption = { createdAt: -1 };

  // Pagination
  const currentPage = Number(page);
  const pageSize = Number(limit);
  const skip = (currentPage - 1) * pageSize;

  const totalProducts = await Product.countDocuments(query);
  const products = await Product.find(query)
    .populate('category', 'name slug')
    .sort(sortOption)
    .skip(skip)
    .limit(pageSize);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        products,
        pagination: {
          totalProducts,
          totalPages: Math.ceil(totalProducts / pageSize),
          currentPage,
          pageSize
        }
      },
      'Products fetched successfully'
    )
  );
});

/**
 * Get single product by ID
 * @route GET /api/v1/products/:id
 */
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('category', 'name slug');
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }
  return res.status(200).json(new ApiResponse(200, product, 'Product details fetched'));
});

/**
 * Create Product (Admin Only)
 * @route POST /api/v1/products
 */
const createProduct = asyncHandler(async (req, res) => {
  const { name, description, price, discountPrice, category, stock, images, isFeatured } = req.body;

  if (!name || !description || !price || !category || stock === undefined) {
    throw new ApiError(400, 'Name, description, price, category, and stock are required');
  }

  const product = await Product.create({
    name,
    description,
    price,
    discountPrice: discountPrice || 0,
    category,
    stock,
    images: images || [],
    isFeatured: isFeatured || false
  });

  return res.status(201).json(new ApiResponse(201, product, 'Product created successfully'));
});

/**
 * Update Product (Admin Only)
 * @route PUT /api/v1/products/:id
 */
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  return res.status(200).json(new ApiResponse(200, product, 'Product updated successfully'));
});

/**
 * Delete Product (Admin Only)
 * @route DELETE /api/v1/products/:id
 */
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }
  return res.status(200).json(new ApiResponse(200, {}, 'Product deleted successfully'));
});

/**
 * Create or Update Product Review
 * @route POST /api/v1/products/:id/reviews
 */
const createProductReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  const isReviewed = product.reviews.find(
    (rev) => rev.user.toString() === req.user._id.toString()
  );

  if (isReviewed) {
    product.reviews.forEach((rev) => {
      if (rev.user.toString() === req.user._id.toString()) {
        rev.rating = Number(rating);
        rev.comment = comment;
      }
    });
  } else {
    product.reviews.push({
      user: req.user._id,
      name: req.user.name,
      rating: Number(rating),
      comment
    });
    product.numReviews = product.reviews.length;
  }

  product.ratings =
    product.reviews.reduce((acc, item) => item.rating + acc, 0) /
    product.reviews.length;

  await product.save();
  return res.status(200).json(new ApiResponse(200, {}, 'Review added/updated successfully'));
});

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductReview
};
