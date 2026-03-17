const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");
const User = require("../models/user.model");
const env = require("../config/env");

async function requireAuth(req, _res, next) {
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
