const mongoose = require("mongoose");

const counterfeitFlagSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    qrId: { type: String, required: true, index: true },
    reason: {
      type: String,
      enum: ["duplicate_scan_after_sold", "invalid_transition_attempt", "multi_region_scan_pattern", "manual_report"],
      required: true,
    },
    severity: { type: String, enum: ["low", "medium", "high", "critical"], required: true },
    firstDetectedAt: { type: Date, default: Date.now, required: true },
    scanEventIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "ScanEvent" }],
    isOpen: { type: Boolean, default: true, index: true },
    resolvedAt: { type: Date, default: null },
    resolutionNote: { type: String, default: null },
  },
  { collection: "counterfeit_flags" }
);

counterfeitFlagSchema.index({ productId: 1, isOpen: 1 });
counterfeitFlagSchema.index({ qrId: 1, isOpen: 1, firstDetectedAt: -1 });

module.exports = mongoose.model("CounterfeitFlag", counterfeitFlagSchema);
