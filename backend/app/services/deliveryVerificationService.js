import crypto from "crypto";
import jwt from "jsonwebtoken";
import Delivery from "../models/delivery.js";
import OtpVerification from "../models/otpVerification.js";
import { getRedisClient } from "../config/redis.js";
import { sendSmsIndiaHubOtp } from "./smsIndiaHubService.js";
import { MOCK_OTP, useRealSMS } from "../utils/otp.js";

const DELIVERY_SIGNUP_PURPOSE = "delivery_signup";
const OTP_EXPIRY_MINUTES = () =>
  parseInt(process.env.OTP_EXPIRY_MINUTES || "5", 10);
const OTP_RESEND_COOLDOWN_SECONDS = () =>
  parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || "60", 10);
const OTP_MAX_FAILED_ATTEMPTS = () =>
  parseInt(process.env.OTP_MAX_FAILED_ATTEMPTS || "5", 10);
const OTP_SEND_LIMIT_WINDOW_SECONDS = () =>
  parseInt(process.env.OTP_SEND_LIMIT_WINDOW_SECONDS || "900", 10);
const OTP_SEND_LIMIT_PER_WINDOW = () =>
  parseInt(process.env.OTP_SEND_LIMIT_PER_WINDOW || "5", 10);
const OTP_VERIFY_LIMIT_WINDOW_SECONDS = () =>
  parseInt(process.env.OTP_VERIFY_LIMIT_WINDOW_SECONDS || "900", 10);
const OTP_VERIFY_LIMIT_PER_WINDOW = () =>
  parseInt(process.env.OTP_VERIFY_LIMIT_PER_WINDOW || "20", 10);

function verificationSecret() {
  return process.env.OTP_HASH_SECRET || process.env.JWT_SECRET || "unsafe-dev-secret";
}

function randomOtp() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function normalizePhone(value) {
  let phone = String(value || "").replace(/\D/g, "");
  if (phone.length === 12 && phone.startsWith("91")) phone = phone.slice(2);
  else if (phone.length === 11 && phone.startsWith("0")) phone = phone.slice(1);
  else if (phone.length > 10) phone = phone.slice(-10);
  if (!/^\d{10}$/.test(phone)) {
    const error = new Error("Please enter a valid 10-digit phone number");
    error.statusCode = 400;
    throw error;
  }
  return phone;
}

function maskPhone(phone) {
  const v = String(phone || "").trim();
  return v.length <= 4 ? "***" : `${v.slice(0, 2)}******${v.slice(-2)}`;
}

function hashOtp(target, otp) {
  return crypto
    .createHmac("sha256", verificationSecret())
    .update(`${DELIVERY_SIGNUP_PURPOSE}:phone:${target}:${otp}`)
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
    } catch { /* fall through */ }
  }
  if (!globalThis.__DELIVERY_OTP_WINDOW_COUNTER__) {
    globalThis.__DELIVERY_OTP_WINDOW_COUNTER__ = new Map();
  }
  const now = Date.now();
  const store = globalThis.__DELIVERY_OTP_WINDOW_COUNTER__;
  const entry = store.get(redisKey);
  if (!entry || entry.expiresAt <= now) {
    store.set(redisKey, { count: 1, expiresAt: now + windowSeconds * 1000 });
    return true;
  }
  entry.count += 1;
  store.set(redisKey, entry);
  return entry.count <= limit;
}

function signVerificationToken(target) {
  return jwt.sign(
    { purpose: DELIVERY_SIGNUP_PURPOSE, channel: "phone", target, verified: true },
    verificationSecret(),
    { expiresIn: process.env.DELIVERY_VERIFICATION_TOKEN_EXPIRY || "2h" },
  );
}

export function verifyDeliveryPhoneToken({ phone, token }) {
  const target = normalizePhone(phone);
  if (!token) {
    const error = new Error("Phone verification is required to register");
    error.statusCode = 400;
    throw error;
  }
  let payload;
  try {
    payload = jwt.verify(token, verificationSecret());
  } catch {
    const error = new Error("Verification expired. Please verify your phone again.");
    error.statusCode = 400;
    throw error;
  }
  if (
    payload?.purpose !== DELIVERY_SIGNUP_PURPOSE ||
    payload?.channel !== "phone" ||
    payload?.target !== target ||
    payload?.verified !== true
  ) {
    const error = new Error("Phone verification does not match. Please verify again.");
    error.statusCode = 400;
    throw error;
  }
  return target;
}

export async function issueDeliveryPhoneOtp({ phone, ipAddress = "unknown" }) {
  const target = normalizePhone(phone);

  // Block if already verified and active
  const existing = await Delivery.findOne({ phone: target }).select("isVerified isDeleted").lean();
  if (existing?.isVerified && !existing?.isDeleted) {
    const error = new Error("This mobile number is already registered. Please sign in instead.");
    error.statusCode = 400;
    throw error;
  }

  const sendAllowed = await incrementWindowCounter(
    `delivery:otp:send:phone:${target}`,
    { limit: OTP_SEND_LIMIT_PER_WINDOW(), windowSeconds: OTP_SEND_LIMIT_WINDOW_SECONDS() },
  );
  if (!sendAllowed) {
    const error = new Error("Too many OTP requests. Please try again later.");
    error.statusCode = 429;
    throw error;
  }

  const now = new Date();
  let session = await OtpVerification.findOne({
    purpose: DELIVERY_SIGNUP_PURPOSE,
    channel: "phone",
    target,
  }).select("+otpHash +expiresAt");

  if (session?.lastSentAt) {
    const elapsedMs = now.getTime() - new Date(session.lastSentAt).getTime();
    const cooldownMs = OTP_RESEND_COOLDOWN_SECONDS() * 1000;
    if (elapsedMs < cooldownMs) {
      const waitSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
      const error = new Error(`Please wait ${waitSeconds}s before requesting another OTP`);
      error.statusCode = 429;
      throw error;
    }
  }

  const otp = useRealSMS() ? randomOtp() : MOCK_OTP;
  const testNumbers = ["6268423925", "9111966732", "8982292201"];
  const finalOtp = testNumbers.includes(target) ? "1234" : otp;

  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES() * 60 * 1000);

  if (!session) {
    session = new OtpVerification({
      purpose: DELIVERY_SIGNUP_PURPOSE,
      channel: "phone",
      target,
      otpHash: hashOtp(target, finalOtp),
      expiresAt,
      verifiedAt: null,
      failedAttempts: 0,
      lastSentAt: now,
    });
  } else {
    session.otpHash = hashOtp(target, finalOtp);
    session.expiresAt = expiresAt;
    session.verifiedAt = null;
    session.failedAttempts = 0;
    session.lastSentAt = now;
  }
  await session.save();

  if (useRealSMS() && !testNumbers.includes(target)) {
    await sendSmsIndiaHubOtp({ phone: target, otp: finalOtp });
  } else {
    console.log(`[DeliveryPhoneOTP][mock] ${target} -> ${finalOtp}`);
  }

  return {
    sent: true,
    maskedPhone: maskPhone(target),
    expiresInSeconds: OTP_EXPIRY_MINUTES() * 60,
  };
}

export async function verifyDeliveryPhoneOtp({ phone, otp, ipAddress = "unknown" }) {
  const target = normalizePhone(phone);
  const code = String(otp || "").trim();

  if (!/^\d{4}$/.test(code)) {
    const error = new Error("Please enter a valid 4-digit OTP");
    error.statusCode = 400;
    throw error;
  }

  const verifyAllowed = await incrementWindowCounter(
    `delivery:otp:verify:phone:${target}`,
    { limit: OTP_VERIFY_LIMIT_PER_WINDOW(), windowSeconds: OTP_VERIFY_LIMIT_WINDOW_SECONDS() },
  );
  if (!verifyAllowed) {
    const error = new Error("Too many verification attempts. Please try again later.");
    error.statusCode = 429;
    throw error;
  }

  const session = await OtpVerification.findOne({
    purpose: DELIVERY_SIGNUP_PURPOSE,
    channel: "phone",
    target,
  }).select("+otpHash +expiresAt");

  if (!session?.otpHash || !session?.expiresAt || session.expiresAt <= new Date()) {
    const error = new Error("Invalid or expired OTP");
    error.statusCode = 400;
    throw error;
  }

  const isValid = hashOtp(target, code) === session.otpHash;
  if (!isValid) {
    session.failedAttempts = (session.failedAttempts || 0) + 1;
    await session.save();
    if (session.failedAttempts >= OTP_MAX_FAILED_ATTEMPTS()) {
      await OtpVerification.deleteOne({ _id: session._id });
    }
    const error = new Error("Invalid or expired OTP");
    error.statusCode = 400;
    throw error;
  }

  session.verifiedAt = new Date();
  session.failedAttempts = 0;
  await session.save();

  return {
    verified: true,
    verificationToken: signVerificationToken(target),
  };
}
