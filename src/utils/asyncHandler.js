// Wraps async route handlers so errors are passed to next() automatically.
// Without this, unhandled promise rejections in async handlers are not
// caught by Express's error middleware.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
