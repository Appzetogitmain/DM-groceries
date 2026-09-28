import crypto from "crypto";
import jwt from "jsonwebtoken";
import Admin from "../models/admin.js";
import OtpVerification from "../models/otpVerification.js";
import { getRedisClient } from "../config/redis.js";
import { sendSmsIndiaHubOtp } from "./smsIndiaHubService.js";
import { MOCK_OTP, useRealSMS } from "../utils/otp.js";
import { sendSellerVerificationOtpEmail, useRealEmailOTP } from "./emailService.js";

const ADMIN_RESET_PURPOSE = "admin_reset";
const OTP_EXPIRY_MINUTES = () => parseInt(process.env.OTP_EXPIRY_MINUTES || "5", 10);
const OTP_RESEND_COOLDOWN_SECONDS = () => parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || "60", 10);
const OTP_MAX_FAILED_ATTEMPTS = () => parseInt(process.env.OTP_MAX_FAILED_ATTEMPTS || "5", 10);
const OTP_SEND_LIMIT_WINDOW_SECONDS = () => 900;
const OTP_SEND_LIMIT_PER_WINDOW = () => 5;
const OTP_VERIFY_LIMIT_WINDOW_SECONDS = () => 900;
const OTP_VERIFY_LIMIT_PER_WINDOW = () => 20;
const OTP_LENGTH = () => 4;

function verificationSecret() {
  return process.env.OTP_HASH_SECRET || process.env.JWT_SECRET || "unsafe-dev-secret";
}

function randomOtp(length) {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
}

function generateAdminOtp(channel) {
  const production = process.env.NODE_ENV === "production";
  const useRealDelivery = channel === "email" ? useRealEmailOTP() : useRealSMS();
  if (production && !useRealDelivery) {
    const error = new Error(channel === "email" ? "Email OTP delivery is not configured" : "SMS OTP delivery is not configured");
    error.statusCode = 500;
    throw error;
  }
  return useRealDelivery ? randomOtp(OTP_LENGTH()) : MOCK_OTP;
}

function hashOtp(channel, target, otp, purpose) {
  return crypto
    .createHmac("sha256", verificationSecret())
    .update(`${purpose}:${channel}:${target}:${otp}`)
    .digest("hex");
}

async function incrementWindowCounter(redisKey, { limit, windowSeconds }) {
  const redis = getRedisClient();
  if (redis) {
    try {
      const [count] = await Promise.all([
        redis.incr(redisKey),
        redis.expire(redisKey, windowSeconds),
      ]);
      return Number(count) <= limit;
    } catch {
      // fallback
    }
  }

  if (!globalThis.__ADMIN_OTP_WINDOW_COUNTER__) {
    globalThis.__ADMIN_OTP_WINDOW_COUNTER__ = new Map();
  }

  const now = Date.now();
  const store = globalThis.__ADMIN_OTP_WINDOW_COUNTER__;
  const entry = store.get(redisKey);

  if (!entry || entry.expiresAt <= now) {
    store.set(redisKey, { count: 1, expiresAt: now + windowSeconds * 1000 });
    return true;
  }
  entry.count += 1;
  store.set(redisKey, entry);
  return entry.count <= limit;
}

function normalizeTarget(channel, rawValue) {
  if (channel === "email") {
    const email = String(rawValue || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Object.assign(new Error("Invalid email"), { statusCode: 400 });
    return email;
  }
  const error = new Error("Unsupported channel");
  error.statusCode = 400;
  throw error;
}

export function verifyAdminVerificationToken({ channel, rawValue, token, purpose }) {
  const normalizedChannel = String(channel || "").trim().toLowerCase();
  const normalizedTarget = normalizeTarget(normalizedChannel, rawValue);

  if (!token) {
    throw Object.assign(new Error(`Verification token required to reset password`), { statusCode: 400 });
  }

  let payload;
  try {
    payload = jwt.verify(token, verificationSecret());
  } catch {
    throw Object.assign(new Error("Verification expired"), { statusCode: 400 });
  }

  if (payload?.purpose !== purpose || payload?.channel !== normalizedChannel || payload?.target !== normalizedTarget || payload?.verified !== true) {
    throw Object.assign(new Error("Verification does not match"), { statusCode: 400 });
  }
  return { channel: normalizedChannel, target: normalizedTarget };
}

export async function issueAdminResetOtp({ channel, rawValue, ipAddress = "unknown" }) {
  const normalizedChannel = String(channel || "").trim().toLowerCase();
  const target = normalizeTarget(normalizedChannel, rawValue);

  const existingAdmin = await Admin.findOne({ email: target }).select("_id").lean();
  if (!existingAdmin) {
    throw Object.assign(new Error("No admin found with this email"), { statusCode: 404 });
  }

  const sendAllowed = await incrementWindowCounter(`admin:reset_otp:send:${normalizedChannel}:${target}`, {
    limit: OTP_SEND_LIMIT_PER_WINDOW(),
    windowSeconds: OTP_SEND_LIMIT_WINDOW_SECONDS(),
  });
  if (!sendAllowed) throw Object.assign(new Error("Too many requests"), { statusCode: 429 });

  const now = new Date();
  let session = await OtpVerification.findOne({ purpose: ADMIN_RESET_PURPOSE, channel: normalizedChannel, target }).select("+otpHash +expiresAt");
  
  if (session?.lastSentAt) {
    const elapsedMs = now.getTime() - new Date(session.lastSentAt).getTime();
    const cooldownMs = OTP_RESEND_COOLDOWN_SECONDS() * 1000;
    if (elapsedMs < cooldownMs) {
      const waitSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
      throw Object.assign(new Error(`Please wait ${waitSeconds}s`), { statusCode: 429 });
    }
  }

  const otp = generateAdminOtp(normalizedChannel);
  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES() * 60 * 1000);

  if (!session) {
    session = new OtpVerification({
      purpose: ADMIN_RESET_PURPOSE,
      channel: normalizedChannel,
      target,
      otpHash: hashOtp(normalizedChannel, target, otp, ADMIN_RESET_PURPOSE),
      expiresAt,
      verifiedAt: null,
      failedAttempts: 0,
      lastSentAt: now,
    });
  } else {
    session.otpHash = hashOtp(normalizedChannel, target, otp, ADMIN_RESET_PURPOSE);
    session.expiresAt = expiresAt;
    session.verifiedAt = null;
    session.failedAttempts = 0;
    session.lastSentAt = now;
  }
  await session.save();

  if (normalizedChannel === "email") {
    // Reuse the seller email template for simplicity (which just sends an OTP).
    await sendSellerVerificationOtpEmail({ email: target, otp, expiresInMinutes: OTP_EXPIRY_MINUTES() });
  }
  return { sent: true, channel: normalizedChannel };
}

export async function verifyAdminResetOtpCode({ channel, rawValue, otp, ipAddress = "unknown" }) {
  const normalizedChannel = String(channel || "").trim().toLowerCase();
  const target = normalizeTarget(normalizedChannel, rawValue);
  const code = String(otp || "").trim();

  if (!/^\d{4}$/.test(code)) throw Object.assign(new Error("Invalid OTP"), { statusCode: 400 });

  const verifyAllowed = await incrementWindowCounter(`admin:reset_otp:verify:${normalizedChannel}:${target}`, {
    limit: OTP_VERIFY_LIMIT_PER_WINDOW(),
    windowSeconds: OTP_VERIFY_LIMIT_WINDOW_SECONDS(),
  });
  if (!verifyAllowed) throw Object.assign(new Error("Too many attempts"), { statusCode: 429 });

  const session = await OtpVerification.findOne({ purpose: ADMIN_RESET_PURPOSE, channel: normalizedChannel, target }).select("+otpHash +expiresAt");
  if (!session || !session.otpHash || !session.expiresAt || session.expiresAt <= new Date()) {
    throw Object.assign(new Error("Invalid or expired OTP"), { statusCode: 400 });
  }

  const isValid = hashOtp(normalizedChannel, target, code, ADMIN_RESET_PURPOSE) === session.otpHash;
  if (!isValid) {
    session.failedAttempts = (session.failedAttempts || 0) + 1;
    await session.save();
    if (session.failedAttempts >= OTP_MAX_FAILED_ATTEMPTS()) {
      await OtpVerification.deleteOne({ _id: session._id });
    }
    throw Object.assign(new Error("Invalid or expired OTP"), { statusCode: 400 });
  }

  session.verifiedAt = new Date();
  session.failedAttempts = 0;
  await session.save();

  const token = jwt.sign(
    { purpose: ADMIN_RESET_PURPOSE, channel: normalizedChannel, target, verified: true },
    verificationSecret(),
    { expiresIn: "1h" }
  );

  return { verified: true, channel: normalizedChannel, verificationToken: token };
}
