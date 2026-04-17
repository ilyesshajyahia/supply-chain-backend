const asyncHandler = require("../utils/asyncHandler");
const mongoose = require("mongoose");
const env = require("../config/env");

const health = asyncHandler(async (_req, res) => {
  res.json({
    ok: true,
    message: "Backend healthy",
    timestamp: new Date().toISOString(),
  });
});

const healthDetails = asyncHandler(async (_req, res) => {
  const readyState = mongoose.connection.readyState;

  const rpcHostFor = (rpcUrl) => {
    try {
      if (!rpcUrl) return null;
      return new URL(rpcUrl).host;
    } catch (_) {
      return null;
    }
  };

  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    nodeEnv: env.nodeEnv,
    uptimeSeconds: Math.round(process.uptime()),
    database: {
      connected: readyState === 1,
      readyState,
    },
    chain: {
      activeChain: env.activeChain || "l1",
      l1: {
        chainId: env.l1?.chainId || null,
        rpcHost: rpcHostFor(env.l1?.rpcUrl),
        registryAddress: env.l1?.productRegistryAddress || null,
        lifecycleAddress: env.l1?.productLifecycleAddress || null,
      },
      l2: {
        chainId: env.l2?.chainId || null,
        rpcHost: rpcHostFor(env.l2?.rpcUrl),
        registryAddress: env.l2?.productRegistryAddress || null,
        lifecycleAddress: env.l2?.productLifecycleAddress || null,
      },
    },
    email: {
      provider: env.resendApiKey ? "resend" : "smtp",
      configured: Boolean(env.emailFrom && (env.resendApiKey || env.smtpUser)),
      from: env.emailFrom || null,
    },
  });
});

module.exports = { health, healthDetails };
