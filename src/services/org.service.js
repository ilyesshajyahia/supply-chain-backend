const User = require("../models/user.model");
const ProductEvent = require("../models/productEvent.model");
const ApiError = require("../utils/ApiError");
const { logAuditEvent } = require("./audit.service");
const {
  listAnchors,
  createAndAnchorBatch,
  getAnchorStatus,
  buildAnchorProof,
} = require("./anchor.service");

async function listOrgUsers(orgId) {
  return User.find({ orgId })
    .select("name email role orgId isActive emailVerified isOrgAdmin createdAt")
    .sort({ createdAt: -1 })
    .lean();
}

async function setUserActive({ orgId, userId, isActive, actorUser, req }) {
  const user = await User.findOne({ _id: userId, orgId });
  if (!user) throw new ApiError(404, "User not found in org");
  user.isActive = Boolean(isActive);
  await user.save();
  await logAuditEvent({
    orgId,
    action: isActive ? "user_approved" : "user_rejected",
    actorUser,
    targetUser: user,
    meta: { isActive: Boolean(isActive) },
    req,
  });
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

async function setUserOrgAdmin({ orgId, userId, isOrgAdmin, actorUser, req }) {
  const user = await User.findOne({ _id: userId, orgId });
  if (!user) throw new ApiError(404, "User not found in org");
  user.isOrgAdmin = Boolean(isOrgAdmin);
  await user.save();
  await logAuditEvent({
    orgId,
    action: "user_admin_updated",
    actorUser,
    targetUser: user,
    meta: { isOrgAdmin: Boolean(isOrgAdmin) },
    req,
  });
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

async function getGasMetrics({ orgId, days = 30 }) {
  const rangeDays = Number(days);
  const since = Number.isFinite(rangeDays) && rangeDays > 0
    ? new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000)
    : null;

  const pipeline = [
    {
      $lookup: {
        from: "products",
        localField: "productId",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $match: {
        "product.orgId": orgId,
        txHash: { $ne: null },
      },
    },
    ...(since ? [{ $match: { timestamp: { $gte: since } } }] : []),
    {
      $project: {
        action: 1,
        gasUsed: {
          $toDouble: {
            $ifNull: ["$meta.gas.gasUsed", "$meta.lifecycleGas.gasUsed", "0"],
          },
        },
        costEth: {
          $toDouble: {
            $ifNull: ["$meta.gas.costEth", "$meta.lifecycleGas.costEth", "0"],
          },
        },
      },
    },
    {
      $group: {
        _id: "$action",
        txCount: { $sum: 1 },
        avgGasUsed: { $avg: "$gasUsed" },
        avgCostEth: { $avg: "$costEth" },
        totalCostEth: { $sum: "$costEth" },
      },
    },
    { $sort: { _id: 1 } },
  ];

  const rows = await ProductEvent.aggregate(pipeline);
  const byAction = rows.map((row) => ({
    action: row._id,
    txCount: row.txCount,
    avgGasUsed: Math.round(row.avgGasUsed || 0),
    avgCostEth: Number((row.avgCostEth || 0).toFixed(8)),
    totalCostEth: Number((row.totalCostEth || 0).toFixed(8)),
  }));

  const totals = byAction.reduce(
    (acc, item) => ({
      txCount: acc.txCount + item.txCount,
      totalCostEth: acc.totalCostEth + item.totalCostEth,
    }),
    { txCount: 0, totalCostEth: 0 }
  );

  return {
    periodDays: since ? rangeDays : null,
    byAction,
    totals: {
      txCount: totals.txCount,
      totalCostEth: Number(totals.totalCostEth.toFixed(8)),
    },
  };
}

async function getOrgAnchorStatus(orgId) {
  return getAnchorStatus(orgId);
}

async function listOrgAnchors({ orgId, limit }) {
  return listAnchors(orgId, limit);
}

async function runOrgAnchor({ orgId }) {
  return createAndAnchorBatch({ orgId, triggerReason: "manual" });
}

async function getOrgAnchorProof({ orgId, anchorId, eventId }) {
  return buildAnchorProof({ orgId, anchorId, eventId });
}

module.exports = {
  listOrgUsers,
  setUserActive,
  setUserOrgAdmin,
  getGasMetrics,
  getOrgAnchorStatus,
  listOrgAnchors,
  runOrgAnchor,
  getOrgAnchorProof,
};
