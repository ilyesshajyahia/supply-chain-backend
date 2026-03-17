const ApiError = require("../utils/ApiError");

function requireOrgAdmin(req, _res, next) {
  if (!req.user) {
    return next(new ApiError(401, "Unauthorized"));
  }
  if (!req.user.isOrgAdmin) {
    return next(new ApiError(403, "Org admin access required"));
  }
  return next();
}

module.exports = { requireOrgAdmin };