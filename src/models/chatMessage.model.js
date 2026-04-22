const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    orgId: { type: String, required: true, index: true },
    qrId: { type: String, default: null, index: true },
    byUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    byName: { type: String, required: true },
    byRole: {
      type: String,
      enum: ["manufacturer", "distributor", "reseller", "customer"],
      required: true,
    },
    text: { type: String, default: "", trim: true, maxlength: 1000 },
    toRoles: {
      type: [
        {
          type: String,
          enum: ["manufacturer", "distributor", "reseller"],
        },
      ],
      default: ["manufacturer", "distributor", "reseller"],
      index: true,
    },
    attachments: {
      type: [
        {
          fileName: { type: String, required: true },
          mimeType: { type: String, required: true },
          sizeBytes: { type: Number, required: true },
          url: { type: String, required: true },
        },
      ],
      default: [],
    },
    seenByUserIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
      index: true,
    },
  },
  { timestamps: true, collection: "chat_messages" }
);

chatMessageSchema.index({ orgId: 1, qrId: 1, createdAt: -1 });

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
