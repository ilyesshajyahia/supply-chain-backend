const ApiError = require("../utils/ApiError");

function notFound(req, _res, next) {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
}

function errorHandler(err, _req, res, _next) {
  const status = err.statusCode || 500;
  res.status(status).json({
    ok: false,
    message: err.message || "Internal server error",
    details: err.details || null,
  });
}

module.exports = { notFound, errorHandler };
