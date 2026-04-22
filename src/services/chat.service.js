const ApiError = require("../utils/ApiError");
const ChatMessage = require("../models/chatMessage.model");
const Product = require("../models/product.model");
const User = require("../models/user.model");
const { storeChatAttachments } = require("../utils/chatAttachmentStorage");

const INTERNAL_ROLES = ["manufacturer", "distributor", "reseller"];

function allowedRecipientsForSender(senderRole) {
  switch (String(senderRole || "").toLowerCase()) {
    case "manufacturer":
      return ["distributor"];
    case "distributor":
      return ["manufacturer", "reseller"];
    case "reseller":
      return ["distributor"];
    default:
      return [];
  }
}

function normalizeRecipientRoles(rawToRoles, senderRole) {
  const sender = String(senderRole || "").toLowerCase();
  const allowedRecipients = allowedRecipientsForSender(sender);
  if (allowedRecipients.length === 0) {
    throw new ApiError(403, "Role not allowed to use chat");
  }
  const input = Array.isArray(rawToRoles) ? rawToRoles : [];
  const normalized = [...new Set(input.map((r) => String(r).toLowerCase()))].filter((r) =>
    allowedRecipients.includes(r)
  );

  if (normalized.length === 0) {
    return allowedRecipients;
  }
  return normalized;
}

async function ensureProductInOrg({ orgId, qrId }) {
  if (!qrId) return;
  const product = await Product.findOne({ qrId, orgId }).lean();
  if (!product) {
    throw new ApiError(404, "Product thread not found in your organization");
  }
}

async function listMessages({ orgId, qrId, limit = 50 }) {
  const normalizedLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  await ensureProductInOrg({ orgId, qrId });

  const query = { orgId };
  if (qrId) query.qrId = qrId;
  else query.qrId = null;

  const messages = await ChatMessage.find(query)
    .sort({ createdAt: -1 })
    .limit(normalizedLimit)
    .lean();

  return messages.reverse();
}

async function listMessagesForUser({ user, qrId, limit = 50 }) {
  const normalizedLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  await ensureProductInOrg({ orgId: user.orgId, qrId });

  const query = {
    orgId: user.orgId,
    $or: [{ byUserId: user._id }, { toRoles: user.role }],
  };
  if (qrId) query.qrId = qrId;
  else query.qrId = null;

  await ChatMessage.updateMany(
    {
      ...query,
      seenByUserIds: { $ne: user._id },
    },
    {
      $addToSet: { seenByUserIds: user._id },
    }
  );

  const messages = await ChatMessage.find(query)
    .sort({ createdAt: -1 })
    .limit(normalizedLimit)
    .lean();

  const userId = String(user._id);
  return messages.reverse().map((m) => {
    const seenIds = (m.seenByUserIds || []).map((id) => String(id));
    return {
      id: String(m._id),
      orgId: m.orgId,
      qrId: m.qrId,
      byUserId: String(m.byUserId),
      byName: m.byName,
      byRole: m.byRole,
      text: m.text,
      toRoles: m.toRoles || [],
      attachments: m.attachments || [],
      createdAt: m.createdAt,
      seenByCount: seenIds.length,
      seenByMe: seenIds.includes(userId),
    };
  });
}

async function sendMessage({ user, qrId, text, toRoles, attachments }) {
  const trimmed = String(text || "").trim();
  if (trimmed.length > 1000) {
    throw new ApiError(400, "Message too long (max 1000 characters)");
  }
  const recipientRoles = normalizeRecipientRoles(toRoles, user.role);
  const storedAttachments = await storeChatAttachments(attachments);
  if (!trimmed && storedAttachments.length === 0) {
    throw new ApiError(400, "Message text or attachment is required");
  }

  await ensureProductInOrg({ orgId: user.orgId, qrId });

  const doc = await ChatMessage.create({
    orgId: user.orgId,
    qrId: qrId || null,
    byUserId: user._id,
    byName: user.name || "User",
    byRole: user.role,
    text: trimmed,
    toRoles: recipientRoles,
    attachments: storedAttachments,
    seenByUserIds: [user._id],
  });

  return {
    id: String(doc._id),
    orgId: doc.orgId,
    qrId: doc.qrId,
    byUserId: String(doc.byUserId),
    byName: doc.byName,
    byRole: doc.byRole,
    text: doc.text,
    toRoles: doc.toRoles || [],
    attachments: doc.attachments || [],
    createdAt: doc.createdAt,
    seenByCount: 1,
    seenByMe: true,
  };
}

async function listParticipantsForUser(user) {
  const recipientRoles = allowedRecipientsForSender(user.role);
  if (recipientRoles.length === 0) return [];

  const users = await User.find({
    orgId: user.orgId,
    role: { $in: recipientRoles },
    isActive: true,
    emailVerified: true,
  })
    .select("name role")
    .sort({ name: 1 })
    .lean();

  return users.map((item) => ({
    id: String(item._id),
    name: item.name,
    role: item.role,
  }));
}

module.exports = {
  listMessages,
  listMessagesForUser,
  sendMessage,
  listParticipantsForUser,
};
