import nodemailer from "nodemailer";
import logger from "./logger.js";

let cachedTransporter = null;

export function useRealEmailOTP() {
  return (
    process.env.USE_REAL_EMAIL_OTP === "true" ||
    process.env.USE_REAL_EMAIL_OTP === "1"
  );
}

function parseSmtpPort() {
  return parseInt(process.env.SMTP_PORT || "587", 10);
}

function parseSmtpSecure(port) {
  if (process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1") {
    return true;
  }

  if (process.env.SMTP_SECURE === "false" || process.env.SMTP_SECURE === "0") {
    return false;
  }

  return port === 465;
}

function getMailFrom() {
  const fromAddress = String(process.env.MAIL_FROM || "").trim();
  const fromName = String(process.env.MAIL_FROM_NAME || "").trim();

  if (!fromAddress) {
    const error = new Error("MAIL_FROM is required for email OTP delivery");
    error.statusCode = 500;
    throw error;
  }

  return fromName ? `${fromName} <${fromAddress}>` : fromAddress;
}

function getTransportConfig() {
  const host = String(process.env.SMTP_HOST || "").trim();
  const port = parseSmtpPort();
  const secure = parseSmtpSecure(port);
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "").trim();

  if (!host) {
    const error = new Error("SMTP_HOST is required for email OTP delivery");
    error.statusCode = 500;
    throw error;
  }

  if (!Number.isFinite(port) || port <= 0) {
    const error = new Error("SMTP_PORT must be a valid number");
    error.statusCode = 500;
    throw error;
  }

  if ((user && !pass) || (!user && pass)) {
    const error = new Error("SMTP_USER and SMTP_PASS must be provided together");
    error.statusCode = 500;
    throw error;
  }

  return {
    host,
    port,
    secure,
    ...(user && pass
      ? {
          auth: {
            user,
            pass,
          },
        }
      : {}),
  };
}

function getTransporter() {
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport(getTransportConfig());
  }

  return cachedTransporter;
}

export async function sendSellerVerificationOtpEmail({
  email,
  otp,
  expiresInMinutes,
}) {
  if (!useRealEmailOTP()) {
    logger.info("Seller email OTP generated in mock mode", {
      email,
      otp,
      mode: "mock",
    });
    return {
      delivered: false,
      mode: "mock",
    };
  }

  const transporter = getTransporter();
  await transporter.sendMail({
    from: getMailFrom(),
    to: email,
    subject: "Verify your seller signup email",
    text: `Your seller signup verification code is ${otp}. This code expires in ${expiresInMinutes} minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a;">
        <p>Your seller signup verification code is:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">${otp}</p>
        <p>This code expires in ${expiresInMinutes} minutes.</p>
      </div>
    `,
  });

  return {
    delivered: true,
    mode: "real",
  };
}

export async function sendSubAdminInviteOtpEmail({
  email,
  otp,
  expiresInMinutes,
}) {
  if (!useRealEmailOTP()) {
    logger.info("Sub Admin invite OTP generated in mock mode", {
      email,
      otp,
      mode: "mock",
    });
    return {
      delivered: false,
      mode: "mock",
    };
  }

  const transporter = getTransporter();
  await transporter.sendMail({
    from: getMailFrom(),
    to: email,
    subject: "Admin Panel — Verify your email",
    text: `Your verification code for admin panel access is ${otp}. This code expires in ${expiresInMinutes} minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; max-width: 480px; margin: 0 auto; padding: 32px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #0B3B24; margin: 0;">Admin Panel Access</h2>
        </div>
        <p style="font-size: 14px; color: #475569;">You have been invited as a Sub Admin. Please use the code below to verify your email:</p>
        <div style="text-align: center; margin: 24px 0;">
          <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0B3B24; margin: 0;">${otp}</p>
        </div>
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">This code expires in ${expiresInMinutes} minutes.</p>
      </div>
    `,
  });

  return {
    delivered: true,
    mode: "real",
  };
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildSellerRejectionEmail({ name, shopName, reason }) {
  const appName = String(process.env.MAIL_FROM_NAME || "DM Groceries").trim() || "DM Groceries";
  const who = String(name || "").trim() || "Seller";
  const shop = String(shopName || "").trim();
  const why = String(reason || "").trim();

  const subject = `Your seller application was not approved - ${appName}`;
  const text =
    `Hello ${who},

` +
    `Thank you for applying to sell on ${appName}${shop ? ` with "${shop}"` : ""}. ` +
    `After reviewing your application, we are unable to approve it at this time.

` +
    `Reason: ${why}

` +
    `You can correct the above and apply again, or contact our support team if you need help.

` +
    `- ${appName} Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; max-width: 520px; margin: 0 auto; padding: 28px;">
      <h2 style="color: #1A4516; margin: 0 0 16px;">Seller application not approved</h2>
      <p>Hello ${escapeHtml(who)},</p>
      <p>Thank you for applying to sell on <strong>${escapeHtml(appName)}</strong>${shop ? ` with <strong>${escapeHtml(shop)}</strong>` : ""}.
      After reviewing your application, we are unable to approve it at this time.</p>
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 14px 16px; margin: 18px 0;">
        <div style="font-size: 12px; font-weight: 700; color: #b91c1c; text-transform: uppercase; letter-spacing: 1px;">Reason</div>
        <div style="margin-top: 6px; color: #7f1d1d;">${escapeHtml(why)}</div>
      </div>
      <p>You can correct the above and apply again, or contact our support team if you need help.</p>
      <p style="color: #64748b; font-size: 13px;">- ${escapeHtml(appName)} Team</p>
    </div>`;
  return { subject, text, html };
}

export async function sendSellerRejectionEmail({ email, name, shopName, reason }) {
  const to = String(email || "").trim();
  if (!to) return { delivered: false, mode: "skipped", reason: "no_email" };

  const content = buildSellerRejectionEmail({ name, shopName, reason });

  if (!useRealEmailOTP()) {
    logger.info("Seller rejection email generated in mock mode", { email: to, mode: "mock" });
    return { delivered: false, mode: "mock" };
  }

  await getTransporter().sendMail({ from: getMailFrom(), to, ...content });
  return { delivered: true, mode: "real" };
}

export function buildSellerApprovalEmail({ name, shopName }) {
  const appName = String(process.env.MAIL_FROM_NAME || "DM Groceries").trim() || "DM Groceries";
  const frontendUrl = String(process.env.FRONTEND_URL || "http://localhost:5173").trim().replace(/\/+$/, "");
  const loginUrl = `${frontendUrl}/seller/auth`;
  const who = String(name || "").trim() || "Seller";
  const shop = String(shopName || "").trim();

  const subject = `Congratulations! Your seller account is approved - ${appName}`;
  const text =
    `Hello ${who},

` +
    `Congratulations! Your seller application for "${shop || who}" has been reviewed and approved by our team.

` +
    `You can now log in to your seller dashboard and start managing your store, products, and inventory.

` +
    `Login here: ${loginUrl}

` +
    `- ${appName} Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; max-width: 520px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #15803d; margin: 0 0 8px;">Account Approved! 🎉</h2>
        <p style="color: #64748b; font-size: 14px; margin: 0;">Welcome to ${escapeHtml(appName)}</p>
      </div>
      <p>Hello <strong>${escapeHtml(who)}</strong>,</p>
      <p>Great news! Your seller application for <strong>${escapeHtml(shop || who)}</strong> has been verified and <strong>approved</strong> by our admin team.</p>
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 16px; margin: 20px 0;">
        <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.5;">
          ✓ Store Status: <strong>Active & Verified</strong><br/>
          ✓ You can now add products and start receiving customer orders.
        </p>
      </div>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${loginUrl}" style="background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block;">
          Go to Seller Dashboard
        </a>
      </div>
      <p style="color: #64748b; font-size: 13px; line-height: 1.4;">
        If the button above does not work, copy and paste this link in your browser:<br/>
        <a href="${loginUrl}" style="color: #16a34a;">${loginUrl}</a>
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">- ${escapeHtml(appName)} Team</p>
    </div>`;

  return { subject, text, html };
}

export async function sendSellerApprovalEmail({ email, name, shopName }) {
  const to = String(email || "").trim();
  if (!to) return { delivered: false, mode: "skipped", reason: "no_email" };

  const content = buildSellerApprovalEmail({ name, shopName });

  if (!useRealEmailOTP()) {
    logger.info("Seller approval email generated in mock mode", { email: to, mode: "mock" });
    return { delivered: false, mode: "mock" };
  }

  try {
    await getTransporter().sendMail({ from: getMailFrom(), to, ...content });
    return { delivered: true, mode: "real" };
  } catch (err) {
    logger.error("Failed to send seller approval email", { email: to, error: err.message });
    return { delivered: false, mode: "failed", error: err.message };
  }
}

export function buildDeliveryApprovalEmail({ name }) {
  const appName = String(process.env.MAIL_FROM_NAME || "DM Groceries").trim() || "DM Groceries";
  const frontendUrl = String(process.env.FRONTEND_URL || "http://localhost:5173").trim().replace(/\/+$/, "");
  const loginUrl = `${frontendUrl}/delivery/auth`;
  const who = String(name || "").trim() || "Delivery Partner";

  const subject = `Congratulations! Your delivery partner account is approved - ${appName}`;
  const text =
    `Hello ${who},

` +
    `Congratulations! Your delivery partner application has been verified and approved by our team.

` +
    `You can now log in to the delivery partner app using your registered phone number, go online, and start accepting delivery requests.

` +
    `Login here: ${loginUrl}

` +
    `- ${appName} Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; max-width: 520px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #15803d; margin: 0 0 8px;">Account Approved! 🛵</h2>
        <p style="color: #64748b; font-size: 14px; margin: 0;">Welcome to ${escapeHtml(appName)} Delivery Fleet</p>
      </div>
      <p>Hello <strong>${escapeHtml(who)}</strong>,</p>
      <p>Congratulations! Your delivery partner application and documents have been reviewed and <strong>approved</strong>.</p>
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 16px; margin: 20px 0;">
        <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.5;">
          ✓ Status: <strong>Verified Partner</strong><br/>
          ✓ You can now go online, receive order alerts, and earn on every delivery.
        </p>
      </div>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${loginUrl}" style="background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block;">
          Open Delivery App / Login
        </a>
      </div>
      <p style="color: #64748b; font-size: 13px; line-height: 1.4;">
        If the button above does not work, copy and paste this link in your browser:<br/>
        <a href="${loginUrl}" style="color: #16a34a;">${loginUrl}</a>
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">- ${escapeHtml(appName)} Team</p>
    </div>`;

  return { subject, text, html };
}

export async function sendDeliveryApprovalEmail({ email, name }) {
  const to = String(email || "").trim();
  if (!to) return { delivered: false, mode: "skipped", reason: "no_email" };

  const content = buildDeliveryApprovalEmail({ name });

  if (!useRealEmailOTP()) {
    logger.info("Delivery approval email generated in mock mode", { email: to, mode: "mock" });
    return { delivered: false, mode: "mock" };
  }

  try {
    await getTransporter().sendMail({ from: getMailFrom(), to, ...content });
    return { delivered: true, mode: "real" };
  } catch (err) {
    logger.error("Failed to send delivery approval email", { email: to, error: err.message });
    return { delivered: false, mode: "failed", error: err.message };
  }
}

export function __resetEmailTransportForTests() {
  cachedTransporter = null;
}

