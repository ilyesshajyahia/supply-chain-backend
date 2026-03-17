const asyncHandler = require("../utils/asyncHandler");
const authService = require("../services/auth.service");
const ApiError = require("../utils/ApiError");
const jwt = require("jsonwebtoken");
const env = require("../config/env");
const User = require("../models/user.model");

const signup = asyncHandler(async (req, res) => {
  const data = await authService.signup(req.body);
  res.status(201).json({ ok: true, data });
});

const login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body);
  res.json({ ok: true, data });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const data = await authService.verifyEmail({ token: req.query.token });
  res.json({ ok: true, data });
});

const resendVerification = asyncHandler(async (req, res) => {
  const data = await authService.resendVerification(req.body);
  res.json({ ok: true, data });
});

const requestPasswordReset = asyncHandler(async (req, res) => {
  const data = await authService.requestPasswordReset(req.body);
  res.json({ ok: true, data });
});

const resetPassword = asyncHandler(async (req, res) => {
  const data = await authService.resetPassword(req.body);
  res.json({ ok: true, data });
});

const refresh = asyncHandler(async (req, res) => {
  const authHeader = req.header("authorization") || req.header("Authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    throw new ApiError(401, "Missing bearer token");
  }
  const token = authHeader.slice(7).trim();
  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch (_err) {
    throw new ApiError(401, "Invalid bearer token");
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) {
    throw new ApiError(401, "User not found or inactive");
  }

  const data = await authService.refreshSession(user);
  res.json({ ok: true, data });
});

const me = asyncHandler(async (req, res) => {
  const data = authService.userProfile(req.user);
  res.json({ ok: true, data });
});

module.exports = {
  signup,
  login,
  verifyEmail,
  resendVerification,
  requestPasswordReset,
  resetPassword,
  refresh,
  me,
};