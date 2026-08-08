const User = require('../models/user.model');
const Order = require('../models/order.model');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');

// Cookie options helper
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
};

/**
 * Generate Access and Refresh Tokens
 */
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      'Something went wrong while generating access and refresh tokens'
    );
  }
};

/**
 * Register User
 * @route POST /api/v1/auth/register
 */
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if ([name, email, password].some((field) => !field || field.trim() === '')) {
    throw new ApiError(400, 'All fields (name, email, password) are required');
  }

  const lowerEmail = email.toLowerCase();
  const existedUser = await User.findOne({ email: lowerEmail });
  if (existedUser) {
    throw new ApiError(409, 'User with this email already exists');
  }

  // Automatically grant 'admin' role to admin@gmail.com or when explicitly specified
  const assignedRole = (lowerEmail === 'admin@gmail.com' || role === 'admin') ? 'admin' : (role || 'user');

  const user = await User.create({
    name,
    email: lowerEmail,
    password,
    role: assignedRole
  });

  const createdUser = await User.findById(user._id).select('-password');
  if (!createdUser) {
    throw new ApiError(500, 'Failed to register user');
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  return res
    .status(201)
    .cookie('accessToken', accessToken, cookieOptions)
    .cookie('refreshToken', refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        201,
        { user: createdUser, accessToken, refreshToken },
        'User registered successfully'
      )
    );
});

/**
 * Login User
 * @route POST /api/v1/auth/login
 */
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  const lowerEmail = email.toLowerCase();
  const user = await User.findOne({ email: lowerEmail }).select('+password');
  if (!user) {
    throw new ApiError(404, 'User does not exist with this email');
  }

  const isPasswordValid = await user.isPasswordMatch(password);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid user credentials');
  }

  // Auto-promote admin@gmail.com to admin role if it was created with role 'user'
  if (user.email.toLowerCase() === 'admin@gmail.com' && user.role !== 'admin') {
    user.role = 'admin';
    await user.save({ validateBeforeSave: false });
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select('-password');

  return res
    .status(200)
    .cookie('accessToken', accessToken, cookieOptions)
    .cookie('refreshToken', refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        'User logged in successfully'
      )
    );
});

/**
 * Logout User
 * @route POST /api/v1/auth/logout
 */
const logoutUser = asyncHandler(async (req, res) => {
  if (req.user?._id) {
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $unset: { refreshToken: 1 }
      },
      { new: true }
    ).catch(() => { });
  }

  return res
    .status(200)
    .clearCookie('accessToken', { ...cookieOptions, path: '/' })
    .clearCookie('refreshToken', { ...cookieOptions, path: '/' })
    .json(new ApiResponse(200, {}, 'User logged out successfully'));
});

/**
 * Get Current User Profile
 * @route GET /api/v1/auth/me
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, 'Current user profile fetched'));
});

/**
 * Update Profile Details
 * @route PUT /api/v1/auth/update-profile
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        name: name || req.user.name,
        phone: phone || req.user.phone
      }
    },
    { new: true, runValidators: true }
  ).select('-password');

  return res
    .status(200)
    .json(new ApiResponse(200, user, 'Profile details updated successfully'));
});

/**
 * Forgot Password - Send Reset Token via Email
 * @route POST /api/v1/auth/forgot-password
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase() });

  if (!user) {
    throw new ApiError(404, 'User not found with this email');
  }

  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

  const message = `
    <h1>Password Reset Request</h1>
    <p>You have requested to reset your password. Click the link below to set a new password:</p>
    <a href="${resetUrl}" target="_blank">${resetUrl}</a>
    <p>This token is valid for 15 minutes.</p>
  `;

  try {
    await sendEmail({
      email: user.email,
      subject: 'E-Commerce Password Recovery',
      message
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {},
          `Password reset email sent to ${user.email}`
        )
      );
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(500, 'Email could not be sent. Try again later.');
  }
});

/**
 * Reset Password
 * @route PUT /api/v1/auth/reset-password/:resetToken
 */
const resetPassword = asyncHandler(async (req, res) => {
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resetToken)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) {
    throw new ApiError(400, 'Invalid or expired reset password token');
  }

  if (!req.body.password) {
    throw new ApiError(400, 'New password is required');
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Password reset successfully! Log in with new credentials.'));
});

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  updateProfile,
  forgotPassword,
  resetPassword
};
