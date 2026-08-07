const ApiError = require('../utils/apiError');

/**
 * Global Error Handling Middleware for Express.
 * Handles ApiError instances, Mongoose validation errors, duplicate key errors, JWT errors, etc.
 */
const errorMiddleware = (err, req, res, next) => {
  let error = err;

  // If error is not an instance of ApiError, wrap it
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || (error.name === 'ValidationError' ? 400 : 500);
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, error.errors || [], err.stack);
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    const message = `Resource not found. Invalid ${err.path}`;
    error = new ApiError(404, message);
  }

  // Handle Mongoose Duplicate Key Error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `Duplicate value entered for field: ${field}. Please use another value.`;
    error = new ApiError(400, message);
  }

  // Handle JWT Invalid Error
  if (err.name === 'JsonWebTokenError') {
    const message = 'JSON Web Token is invalid. Try again';
    error = new ApiError(401, message);
  }

  // Handle JWT Expired Error
  if (err.name === 'TokenExpiredError') {
    const message = 'JSON Web Token is expired. Try again';
    error = new ApiError(401, message);
  }

  const response = {
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    errors: error.errors
  };

  return res.status(error.statusCode).json(response);
};

module.exports = errorMiddleware;
