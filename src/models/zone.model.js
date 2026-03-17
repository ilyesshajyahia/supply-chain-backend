const mongoose = require("mongoose");

const zoneSchema = new mongoose.Schema(
  {
    orgId: { type: String, required: true, index: true },
    role: {
      type: String,
      enum: ["manufacturer", "distributor", "reseller", "customer"],
      required: true,
    },
    name: { type: String, required: true },
    geometry: {
      type: {
        type: String,
        enum: ["Polygon"],
        required: true,
      },
      coordinates: { type: [[[Number]]], required: true },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "zones" }
);

zoneSchema.index({ geometry: "2dsphere" });

module.exports = mongoose.model("Zone", zoneSchema);
