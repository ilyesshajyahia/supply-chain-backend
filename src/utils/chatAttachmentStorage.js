const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const ApiError = require("./ApiError");

const CHAT_UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads", "chat");
const MAX_ATTACHMENTS_PER_MESSAGE = 5;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function sanitizeFileName(fileName) {
  return String(fileName || "attachment")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .slice(0, 90);
}

async function storeChatAttachments(rawAttachments) {
  const attachments = Array.isArray(rawAttachments) ? rawAttachments : [];
  if (attachments.length > MAX_ATTACHMENTS_PER_MESSAGE) {
    throw new ApiError(
      400,
      `Too many attachments (max ${MAX_ATTACHMENTS_PER_MESSAGE})`
    );
  }

  if (attachments.length === 0) return [];
  await fs.mkdir(CHAT_UPLOAD_DIR, { recursive: true });

  const stored = [];
  for (const raw of attachments) {
    const mimeType = String(raw.mimeType || "").toLowerCase().trim();
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new ApiError(400, `Unsupported attachment type: ${mimeType}`);
    }

    const base64 = String(raw.base64 || "").trim();
    if (!base64) {
      throw new ApiError(400, "Attachment base64 payload is required");
    }

    let bytes;
    try {
      bytes = Buffer.from(base64, "base64");
    } catch (_err) {
      throw new ApiError(400, "Invalid attachment encoding");
    }
    if (!bytes || bytes.length === 0) {
      throw new ApiError(400, "Attachment is empty");
    }
    if (bytes.length > MAX_ATTACHMENT_BYTES) {
      throw new ApiError(400, "Attachment too large (max 5MB)");
    }

    const originalName = sanitizeFileName(raw.fileName);
    const randomPrefix = crypto.randomBytes(8).toString("hex");
    const storedName = `${Date.now()}_${randomPrefix}_${originalName}`;
    const absolutePath = path.join(CHAT_UPLOAD_DIR, storedName);
    await fs.writeFile(absolutePath, bytes);

    stored.push({
      fileName: originalName,
      mimeType,
      sizeBytes: bytes.length,
      url: `/uploads/chat/${storedName}`,
    });
  }

  return stored;
}

module.exports = {
  storeChatAttachments,
};
