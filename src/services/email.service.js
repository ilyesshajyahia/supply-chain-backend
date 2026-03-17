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
}

async function sendPasswordResetEmail({ to, resetUrl }) {
  const t = getTransporter();
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
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
