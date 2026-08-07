/**
 * Higher-order function to wrap async controller handlers
 * and pass any caught errors to Express next() middleware.
 *
 * @param {Function} requestHandler
 * @returns {Function} Express middleware function
 */
const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

module.exports = asyncHandler;
