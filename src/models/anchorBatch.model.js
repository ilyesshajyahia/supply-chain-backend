const mongoose = require("mongoose");

const leafItemSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, required: true },
    leafHash: { type: String, required: true },
  },
  { _id: false }
);

const anchorBatchSchema = new mongoose.Schema(
  {
    orgId: { type: String, required: true, index: true },
    network: { type: String, enum: ["l2"], required: true, default: "l2" },
    l2ChainId: { type: Number, required: true },
    l1ChainId: { type: Number, required: true },
    fromEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductEvent",
      required: true,
      index: true,
    },
    toEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductEvent",
      required: true,
      index: true,
    },
    startIndex: { type: Number, required: true },
    endIndex: { type: Number, required: true },
    eventCount: { type: Number, required: true },
    merkleRoot: { type: String, required: true, index: true },
    leafItems: { type: [leafItemSchema], default: [] },
    triggerReason: {
      type: String,
      enum: ["count_threshold", "time_threshold", "manual"],
      required: true,
    },
    l1TxHash: { type: String, default: null, index: true },
    l1BlockNumber: { type: Number, default: null },
    l1ContractAddress: { type: String, default: null },
    status: {
      type: String,
      enum: ["pending", "anchored", "failed"],
      default: "pending",
      index: true,
    },
    errorMessage: { type: String, default: null },
    anchoredAt: { type: Date, default: null, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: true }, collection: "anchor_batches" }
);

anchorBatchSchema.index({ orgId: 1, createdAt: -1 });
anchorBatchSchema.index({ orgId: 1, anchoredAt: -1 });
anchorBatchSchema.index({ orgId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("AnchorBatch", anchorBatchSchema);

