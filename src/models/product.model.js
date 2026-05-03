const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    qrId: { type: String, required: true, unique: true, index: true },
    serialNumber: { type: String, default: null, unique: true, sparse: true, index: true },
    orgId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    brand: { type: String, default: null, trim: true },
    category: { type: String, default: null, trim: true },
    color: { type: String, default: null, trim: true },
    description: { type: String, default: null, trim: true },
    productIdOnChain: { type: String, required: true },
    status: {
      type: String,
      enum: ["at_manufacturer", "at_distributor", "at_reseller", "sold", "suspicious"],
      required: true,
      default: "at_manufacturer",
    },
    currentOwnerRole: {
      type: String,
      enum: ["manufacturer", "distributor", "reseller"],
      required: true,
      default: "manufacturer",
    },
    isSold: { type: Boolean, default: false },
    soldAt: { type: Date, default: null },
    lastTxHash: { type: String, default: null },
    batchNumber: { type: String, default: null, index: true },
    batchStatus: {
      type: String,
      enum: ["active", "suspicious", "quarantined", "recalled"],
      default: "active",
    },
    batchFlagReason: { type: String, default: null },
  },
  { timestamps: true, collection: "products" }
);

productSchema.index({ orgId: 1, status: 1 });

module.exports = mongoose.model("Product", productSchema);
