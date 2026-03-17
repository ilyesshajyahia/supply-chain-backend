const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ["manufacturer", "distributor", "reseller", "customer"],
      required: true,
    },
    orgId: { type: String, required: true, index: true },
    passwordHash: { type: String, required: true },
    isActive: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    emailVerifiedAt: { type: Date, default: null },
    isOrgAdmin: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "users" }
);

module.exports = mongoose.model("User", userSchema);
