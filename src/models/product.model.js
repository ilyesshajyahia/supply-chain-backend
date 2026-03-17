const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    qrId: { type: String, required: true, unique: true, index: true },
    orgId: { type: String, required: true, index: true },
    name: { type: String, required: true },
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
  },
  { timestamps: true, collection: "products" }
);

productSchema.index({ orgId: 1, status: 1 });

module.exports = mongoose.model("Product", productSchema);
