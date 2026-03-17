const mongoose = require("mongoose");

const pointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["Point"], required: true },
    coordinates: { type: [Number], required: true },
  },
  { _id: false }
);

const productEventSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    qrId: { type: String, required: true, index: true },
    action: {
      type: String,
      enum: [
        "created",
        "transferred_to_reseller",
        "transferred_to_distributor",
        "sold",
        "status_marked_suspicious",
      ],
      required: true,
    },
    byUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    byRole: {
      type: String,
      enum: ["manufacturer", "distributor", "reseller", "customer"],
      required: true,
    },
    location: { type: pointSchema, required: true },
    txHash: { type: String, default: null },
    blockNumber: { type: Number, default: null },
    timestamp: { type: Date, default: Date.now, index: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { collection: "product_events" }
);

productEventSchema.index({ productId: 1, timestamp: -1 });
productEventSchema.index({ qrId: 1, timestamp: -1 });
productEventSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("ProductEvent", productEventSchema);
