const dotenv = require("dotenv");

dotenv.config();

const verifyBaseUrl =
  process.env.VERIFY_BASE_URL ||
  "http://localhost:4000/api/v1/auth/verify-email";
const verifyFallbackBaseUrl =
  process.env.VERIFY_FALLBACK_URL ||
  (verifyBaseUrl.startsWith("http")
    ? verifyBaseUrl
    : "http://localhost:4000/api/v1/auth/verify-email");

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET || "replace_me",
  rpcUrl: process.env.RPC_URL,
  chainId: Number(process.env.CHAIN_ID || 0),
  signerPrivateKey: process.env.SIGNER_PRIVATE_KEY,
  rolesManagerAddress: process.env.ROLES_MANAGER_ADDRESS,
  productRegistryAddress: process.env.PRODUCT_REGISTRY_ADDRESS,
  productLifecycleAddress: process.env.PRODUCT_LIFECYCLE_ADDRESS,
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  emailFrom: process.env.EMAIL_FROM || process.env.SMTP_USER,
  verifyBaseUrl,
  verifyFallbackBaseUrl,
  resetBaseUrl: process.env.RESET_BASE_URL || "http://localhost:4000/api/v1/auth/reset-password",
  resendApiKey: process.env.RESEND_API_KEY,
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
