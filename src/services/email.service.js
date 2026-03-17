const nodemailer = require("nodemailer");
const env = require("../config/env");

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  if (!env.smtpUser || !env.smtpPass) {
    throw new Error("SMTP_USER and SMTP_PASS must be set for email verification");
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });

  return transporter;
}

async function sendVerificationEmail({
  to,
  verificationUrl,
  fallbackUrl,
}) {
  const t = getTransporter();
  try {
    await t.sendMail({
      from: env.emailFrom,
      to,
      subject: "Verify your ChainTrace account",
      text: `Please verify your email by opening this link: ${verificationUrl}\nIf it is not clickable, use this fallback link: ${fallbackUrl}`,
      html: `
      <p>Please verify your email to activate your ChainTrace account.</p>
      <p><a href="${verificationUrl}">${verificationUrl}</a></p>
      <p>If the link is not clickable, open:</p>
      <p><a href="${fallbackUrl}">${fallbackUrl}</a></p>
      <p>This link expires in 30 minutes.</p>
    `,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("SMTP sendVerificationEmail failed:", err?.message || err);
    if (err?.code) {
      // eslint-disable-next-line no-console
      console.error("SMTP error code:", err.code);
    }
    if (err?.response) {
      // eslint-disable-next-line no-console
      console.error("SMTP response:", err.response);
    }
    throw err;
  }
}

async function sendPasswordResetEmail({ to, resetUrl }) {
  const t = getTransporter();
  try {
    await t.sendMail({
      from: env.emailFrom,
      to,
      subject: "Reset your ChainTrace password",
      text: `Reset your password by opening this link: ${resetUrl}`,
      html: `
        <p>You requested a password reset for your ChainTrace account.</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link expires in 30 minutes.</p>
      `,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("SMTP sendPasswordResetEmail failed:", err?.message || err);
    if (err?.code) {
      // eslint-disable-next-line no-console
      console.error("SMTP error code:", err.code);
    }
    if (err?.response) {
      // eslint-disable-next-line no-console
      console.error("SMTP response:", err.response);
    }
    throw err;
  }
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
