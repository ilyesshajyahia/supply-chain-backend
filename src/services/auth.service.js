const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");
const User = require("../models/user.model");
const EmailVerificationToken = require("../models/emailVerificationToken.model");
const PasswordResetToken = require("../models/passwordResetToken.model");
const { sendVerificationEmail, sendPasswordResetEmail } = require("./email.service");
const env = require("../config/env");

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function buildVerificationUrl(rawToken) {
  const base = env.verifyBaseUrl;
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}token=${encodeURIComponent(rawToken)}`;
}

function buildVerificationFallbackUrl(rawToken) {
  const base = env.verifyFallbackBaseUrl;
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}token=${encodeURIComponent(rawToken)}`;
}

function buildResetUrl(rawToken) {
  const base = env.resetBaseUrl;
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}token=${encodeURIComponent(rawToken)}`;
}

function isPasswordStrong(password) {
  return /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(
    String(password)
  );
}

function issueJwt(user) {
  return jwt.sign(
    {
      sub: String(user._id),
      role: user.role,
      email: user.email,
      orgId: user.orgId,
    },
    env.jwtSecret,
    { expiresIn: "7d" }
  );
}

async function issueVerificationTokenAndEmail(user) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await EmailVerificationToken.create({
    userId: user._id,
    tokenHash,
    expiresAt,
    usedAt: null,
  });

  const verificationUrl = buildVerificationUrl(rawToken);
  const fallbackUrl = buildVerificationFallbackUrl(rawToken);
  try {
    await sendVerificationEmail({
      to: user.email,
      verificationUrl,
      fallbackUrl,
    });
  } catch (_err) {
    throw new ApiError(502, "Could not send verification email. Please try again later.");
  }
}

async function issuePasswordResetTokenAndEmail(user) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await PasswordResetToken.create({
    userId: user._id,
    tokenHash,
    expiresAt,
    usedAt: null,
  });

  const resetUrl = buildResetUrl(rawToken);
  try {
    await sendPasswordResetEmail({ to: user.email, resetUrl });
  } catch (_err) {
    throw new ApiError(502, "Could not send reset email. Please try again later.");
  }
}

async function signup({ name, email, role, orgId, password }) {
  if (!name || !email || !role || !orgId || !password) {
    throw new ApiError(400, "name, email, role, orgId, password are required");
  }
  if (!isPasswordStrong(password)) {
    throw new ApiError(
      400,
      "Password must be at least 8 characters and include 1 uppercase, 1 number, and 1 special character"
    );
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  let user;

  if (existing) {
    if (existing.emailVerified) {
      throw new ApiError(409, "Email already registered and verified");
    }

    existing.name = name;
    existing.role = role;
    existing.orgId = orgId;
    existing.passwordHash = await bcrypt.hash(String(password), 10);
    existing.isActive = false;
    existing.emailVerified = false;
    existing.emailVerifiedAt = null;
    user = await existing.save();
  } else {
    user = await User.create({
      name,
      email: normalizedEmail,
      role,
      orgId,
      passwordHash: await bcrypt.hash(String(password), 10),
      isActive: false,
      emailVerified: false,
      emailVerifiedAt: null,
    });
  }

  const adminExists = await User.exists({ orgId, isOrgAdmin: true });
  if (!adminExists) {
    user.isOrgAdmin = true;
    await user.save();
  }

  await EmailVerificationToken.deleteMany({ userId: user._id, usedAt: null });
  await issueVerificationTokenAndEmail(user);

  return {
    message: "Signup successful. Check your email to verify your account.",
    userId: user._id,
    email: user.email,
  };
}

async function login({ email, password }) {
  if (!email || !password) {
    throw new ApiError(400, "email and password are required");
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user || !user.passwordHash) {
    throw new ApiError(401, "Invalid credentials");
  }

  const ok = await bcrypt.compare(String(password), user.passwordHash);
  if (!ok) {
    throw new ApiError(401, "Invalid credentials");
  }

  if (!user.emailVerified || !user.isActive) {
    if (!user.emailVerified) {
      throw new ApiError(403, "Email not verified. Please verify your account first.");
    }
    throw new ApiError(403, "Account pending admin approval.");
  }

  const token = issueJwt(user);

  return {
    token,
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      orgId: user.orgId,
      isOrgAdmin: user.isOrgAdmin,
    },
  };
}

async function verifyEmail({ token }) {
  if (!token) throw new ApiError(400, "token is required");

  const tokenHash = hashToken(token);
  const record = await EmailVerificationToken.findOne({ tokenHash });

  if (!record) {
    throw new ApiError(400, "Invalid verification token");
  }
  if (record.usedAt) {
    throw new ApiError(400, "This verification link has already been used");
  }
  if (record.expiresAt <= new Date()) {
    throw new ApiError(400, "Verification token expired. Please request a new one.");
  }

  const user = await User.findById(record.userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.emailVerified = true;
  user.emailVerifiedAt = new Date();
  if (user.isOrgAdmin) {
    user.isActive = true;
  }
  await user.save();

  record.usedAt = new Date();
  await record.save();

  if (user.isOrgAdmin) {
    return { message: "Email verified. Admin account is now active." };
  }
  return { message: "Email verified. Awaiting admin approval to activate." };
}

async function resendVerification({ email }) {
  if (!email) throw new ApiError(400, "email is required");
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  if (user.emailVerified) {
    return { message: "Email already verified." };
  }

  await EmailVerificationToken.deleteMany({ userId: user._id, usedAt: null });
  await issueVerificationTokenAndEmail(user);
  return { message: "Verification email sent." };
}

async function requestPasswordReset({ email }) {
  if (!email) throw new ApiError(400, "email is required");
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    return { message: "If the account exists, a reset link has been sent." };
  }

  await PasswordResetToken.deleteMany({ userId: user._id, usedAt: null });
  await issuePasswordResetTokenAndEmail(user);
  return { message: "If the account exists, a reset link has been sent." };
}

async function resetPassword({ token, password }) {
  if (!token || !password) {
    throw new ApiError(400, "token and password are required");
  }
  if (!isPasswordStrong(password)) {
    throw new ApiError(
      400,
      "Password must be at least 8 characters and include 1 uppercase, 1 number, and 1 special character"
    );
  }

  const tokenHash = hashToken(token);
  const record = await PasswordResetToken.findOne({ tokenHash });
  if (!record) {
    throw new ApiError(400, "Invalid reset token");
  }
  if (record.usedAt) {
    throw new ApiError(400, "This reset link has already been used");
  }
  if (record.expiresAt <= new Date()) {
    throw new ApiError(400, "Reset token expired. Please request a new one.");
  }

  const user = await User.findById(record.userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.passwordHash = await bcrypt.hash(String(password), 10);
  await user.save();

  record.usedAt = new Date();
  await record.save();

  return { message: "Password reset successful. You can now log in." };
}

async function refreshSession(user) {
  const token = issueJwt(user);
  return {
    token,
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      orgId: user.orgId,
      isOrgAdmin: user.isOrgAdmin,
    },
  };
}

function userProfile(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    orgId: user.orgId,
    emailVerified: user.emailVerified,
    isOrgAdmin: user.isOrgAdmin,
  };
}

module.exports = {
  signup,
  login,
  verifyEmail,
  resendVerification,
  requestPasswordReset,
  resetPassword,
  refreshSession,
  userProfile,
};
