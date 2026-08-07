const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Protect routes - Verifies JWT from Cookies or Authorization Bearer header
 */
const verifyJWT = asyncHandler(async (req, res, next) => {
  const token =
    req.cookies?.accessToken ||
    req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    throw new ApiError(401, 'Unauthorized request: No token provided');
  }

  try {
    const decodedToken = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback_secret'
    );

    const user = await User.findById(decodedToken?._id).select('-password');

    if (!user) {
      throw new ApiError(401, 'Invalid Access Token: User not found');
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || 'Invalid Access Token');
  }
});

/**
 * Authorize roles middleware
 * @param  {...String} roles
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      throw new ApiError(
        403,
        `Role (${req.user?.role}) is not allowed to access this resource`
      );
    }
    next();
  };
};

module.exports = {
  verifyJWT,
  authorizeRoles
};
