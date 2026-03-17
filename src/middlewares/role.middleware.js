const ApiError = require("../utils/ApiError");

function roleGuard(allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Unauthorized"));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, "Forbidden: role not allowed"));
    }
    return next();
  };
}

module.exports = roleGuard;
