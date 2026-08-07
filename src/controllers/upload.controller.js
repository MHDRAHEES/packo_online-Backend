const { uploadOnCloudinary } = require('../utils/cloudinary');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Single Image Upload Endpoint
 * @route POST /api/v1/upload/single
 */
const uploadSingleImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'Please select an image file to upload');
  }

  const result = await uploadOnCloudinary(req.file.path, 'ecommerce/products');
  if (!result) {
    throw new ApiError(500, 'Failed to upload image to Cloudinary');
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      { public_id: result.public_id, url: result.secure_url },
      'Image uploaded successfully'
    )
  );
});

/**
 * Multiple Images Upload Endpoint
 * @route POST /api/v1/upload/multiple
 */
const uploadMultipleImages = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, 'Please select image files to upload');
  }

  const uploadPromises = req.files.map((file) =>
    uploadOnCloudinary(file.path, 'ecommerce/products')
  );

  const results = await Promise.all(uploadPromises);

  const images = results.map((item) => ({
    public_id: item.public_id,
    url: item.secure_url
  }));

  return res
    .status(200)
    .json(new ApiResponse(200, images, 'Images uploaded successfully'));
});

module.exports = {
  uploadSingleImage,
  uploadMultipleImages
};
