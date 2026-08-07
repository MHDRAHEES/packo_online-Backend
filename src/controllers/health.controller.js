const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');

/**
 * Health check controller to verify API status.
 * @route GET /api/v1/health
 */
const healthCheck = asyncHandler(async (req, res) => {
  const healthData = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    status: 'OK',
    environment: process.env.NODE_ENV || 'development'
  };

  return res
    .status(200)
    .json(new ApiResponse(200, healthData, 'Server health check passed'));
});

module.exports = {
  healthCheck
};
