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

async function cleanupOldAttachments(days = 30) {
  try {
    const files = await fs.readdir(CHAT_UPLOAD_DIR);
    const now = Date.now();
    const thresholdMs = days * 24 * 60 * 60 * 1000;
    let deletedCount = 0;

    for (const file of files) {
      if (file.startsWith(".")) continue;
      const filePath = path.join(CHAT_UPLOAD_DIR, file);
      const stats = await fs.stat(filePath);
      if (now - stats.mtimeMs > thresholdMs) {
        await fs.unlink(filePath);
        deletedCount++;
      }
    }
    // eslint-disable-next-line no-console
    console.log(`Cleaned up ${deletedCount} old chat attachments (older than ${days} days).`);
  } catch (err) {
    if (err.code !== "ENOENT") {
      // eslint-disable-next-line no-console
      console.error("Failed to cleanup chat attachments:", err);
    }
  }
}

module.exports = {
  storeChatAttachments,
  cleanupOldAttachments,
};
