const dotenv = require("dotenv");

dotenv.config();

function parseChainId(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeChainLabel(value, fallback = "l1") {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "l1" || normalized === "l2") return normalized;
  return fallback;
}

const verifyBaseUrl =
  process.env.VERIFY_BASE_URL ||
  "http://localhost:4000/api/v1/auth/verify-email";
const verifyFallbackBaseUrl =
  process.env.VERIFY_FALLBACK_URL ||
  (verifyBaseUrl.startsWith("http")
    ? verifyBaseUrl
    : "http://localhost:4000/api/v1/auth/verify-email");

const l1 = {
  chainId: parseChainId(process.env.L1_CHAIN_ID || process.env.CHAIN_ID || 0),
  rpcUrl: process.env.L1_RPC_URL || process.env.RPC_URL,
  rolesManagerAddress:
    process.env.L1_ROLES_MANAGER_ADDRESS || process.env.ROLES_MANAGER_ADDRESS,
  productRegistryAddress:
    process.env.L1_PRODUCT_REGISTRY_ADDRESS || process.env.PRODUCT_REGISTRY_ADDRESS,
  productLifecycleAddress:
    process.env.L1_PRODUCT_LIFECYCLE_ADDRESS || process.env.PRODUCT_LIFECYCLE_ADDRESS,
  anchorRegistryAddress:
    process.env.L1_ANCHOR_REGISTRY_ADDRESS || process.env.ANCHOR_REGISTRY_ADDRESS,
};

const l2 = {
  chainId: parseChainId(process.env.L2_CHAIN_ID || 0),
  rpcUrl: process.env.L2_RPC_URL,
  rolesManagerAddress: process.env.L2_ROLES_MANAGER_ADDRESS,
  productRegistryAddress: process.env.L2_PRODUCT_REGISTRY_ADDRESS,
  productLifecycleAddress: process.env.L2_PRODUCT_LIFECYCLE_ADDRESS,
};

const activeChain = normalizeChainLabel(process.env.ACTIVE_CHAIN || "l1", "l1");

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET || "replace_me",
  rpcUrl: l1.rpcUrl,
  chainId: l1.chainId,
  signerPrivateKey: process.env.SIGNER_PRIVATE_KEY,
  rolesManagerAddress: l1.rolesManagerAddress,
  productRegistryAddress: l1.productRegistryAddress,
  productLifecycleAddress: l1.productLifecycleAddress,
  activeChain,
  l1,
  l2,
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  emailFrom: process.env.EMAIL_FROM || process.env.SMTP_USER,
  verifyBaseUrl,
  verifyFallbackBaseUrl,
  resetBaseUrl: process.env.RESET_BASE_URL || "http://localhost:4000/api/v1/auth/reset-password",
  resetDeepLinkBaseUrl:
    process.env.RESET_DEEP_LINK_URL || "chaintrace://reset-password",
  resendApiKey: process.env.RESEND_API_KEY,
  mailtrapApiKey: process.env.MAILTRAP_API_KEY,
  authBypass: String(process.env.AUTH_BYPASS || "false").toLowerCase() === "true",
  l2Anchor: {
    enabled:
      String(process.env.L2_ANCHOR_ENABLED || "true").toLowerCase() === "true",
    batchSize: Math.max(1, Number(process.env.L2_ANCHOR_BATCH_SIZE || 100)),
    maxAgeHours: Math.max(1, Number(process.env.L2_ANCHOR_MAX_AGE_HOURS || 24)),
    sweepMinutes: Math.max(1, Number(process.env.L2_ANCHOR_SWEEP_MINUTES || 10)),
  },
};

const required = [
  "mongoUri",
  "rpcUrl",
  "signerPrivateKey",
  "rolesManagerAddress",
  "productRegistryAddress",
  "productLifecycleAddress",
];

for (const key of required) {
  if (!env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}

module.exports = env;
