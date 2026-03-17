const User = require("../models/user.model");
const ApiError = require("../utils/ApiError");

async function listOrgUsers(orgId) {
  return User.find({ orgId })
    .select("name email role orgId isActive emailVerified isOrgAdmin createdAt")
    .sort({ createdAt: -1 })
    .lean();
}

async function setUserActive({ orgId, userId, isActive }) {
  const user = await User.findOne({ _id: userId, orgId });
  if (!user) throw new ApiError(404, "User not found in org");
  user.isActive = Boolean(isActive);
  await user.save();
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    orgId: user.orgId,
    isActive: user.isActive,
    emailVerified: user.emailVerified,
    isOrgAdmin: user.isOrgAdmin,
  };
}

async function setUserOrgAdmin({ orgId, userId, isOrgAdmin }) {
  const user = await User.findOne({ _id: userId, orgId });
  if (!user) throw new ApiError(404, "User not found in org");
  user.isOrgAdmin = Boolean(isOrgAdmin);
  await user.save();
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    orgId: user.orgId,
    isActive: user.isActive,
    emailVerified: user.emailVerified,
    isOrgAdmin: user.isOrgAdmin,
  };
}

module.exports = { listOrgUsers, setUserActive, setUserOrgAdmin };