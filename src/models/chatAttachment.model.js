const mongoose = require("mongoose");

const chatAttachmentSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    data: { type: Buffer, required: true }, // The binary image data
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "chat_attachments" }
);

module.exports = mongoose.model("ChatAttachment", chatAttachmentSchema);
