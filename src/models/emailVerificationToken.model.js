const mongoose = require("mongoose");

const emailVerificationTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "email_verification_tokens" }
);

module.exports = mongoose.model("EmailVerificationToken", emailVerificationTokenSchema);

