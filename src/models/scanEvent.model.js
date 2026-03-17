const mongoose = require("mongoose");

const pointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["Point"], required: true },
    coordinates: { type: [Number], required: true },
  },
  { _id: false }
);

const scanEventSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null, index: true },
    qrId: { type: String, required: true, index: true },
    scanType: { type: String, enum: ["public", "internal"], required: true },
    scannedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    location: { type: pointSchema, required: true },
    result: {
      type: String,
      enum: ["verified", "unknown_qr", "duplicate_scan_after_sold", "outside_authorized_zone", "denied_role"],
      required: true,
    },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { collection: "scan_events" }
);

scanEventSchema.index({ productId: 1, timestamp: -1 });
scanEventSchema.index({ qrId: 1, timestamp: -1 });
scanEventSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("ScanEvent", scanEventSchema);
