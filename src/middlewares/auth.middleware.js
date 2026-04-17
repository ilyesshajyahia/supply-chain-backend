const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");
const User = require("../models/user.model");
const env = require("../config/env");

async function requireAuth(req, _res, next) {
  if (env.authBypass) {
    req.user = {
      _id: req.header("x-test-user-id") || "000000000000000000000001",
      email: req.header("x-test-email") || "bypass@test.local",
      role: req.header("x-test-role") || "manufacturer",
      orgId: req.header("x-test-org-id") || "org_001",
      isOrgAdmin: String(req.header("x-test-org-admin") || "true").toLowerCase() === "true",
      isActive: true,
      isEmailVerified: true,
    };
    return next();
  }

  const authHeader = req.header("authorization") || req.header("Authorization");
  let userId = null;

  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    try {
      const payload = jwt.verify(token, env.jwtSecret);
      userId = payload.sub;
    } catch (_err) {
      return next(new ApiError(401, "Invalid bearer token"));
    }
  }

  if (!userId) {
    userId = req.header("x-user-id");
  }

  if (!userId) {
    return next(new ApiError(401, "Missing auth token or x-user-id header"));
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return next(new ApiError(401, "Invalid x-user-id"));
  }

  const user = await User.findOne({ _id: userId, isActive: true }).lean();
  if (!user) {
    return next(new ApiError(401, "User not found or inactive"));
  }

  req.user = user;
  return next();
}

module.exports = { requireAuth };
