import { byIp, byUserOrIp, createRateLimiter } from "./rateLimiter.js";

const GLOBAL_RATE_LIMIT_WINDOW_MS = () =>
  parseInt(process.env.GLOBAL_RATE_LIMIT_WINDOW_MS || "60000", 10);
const GLOBAL_RATE_LIMIT_MAX = () =>
  parseInt(process.env.GLOBAL_RATE_LIMIT_MAX || "240", 10);

const AUTH_RATE_LIMIT_WINDOW_MS = () =>
  parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || "60000", 10);
const AUTH_RATE_LIMIT_MAX = () =>
  parseInt(process.env.AUTH_RATE_LIMIT_MAX || "40", 10);

const OTP_RATE_LIMIT_WINDOW_MS = () =>
  parseInt(process.env.OTP_RATE_LIMIT_WINDOW_MS || "60000", 10);
const OTP_RATE_LIMIT_MAX = () =>
  parseInt(process.env.OTP_RATE_LIMIT_MAX || "15", 10);

const PAYMENT_RATE_LIMIT_WINDOW_MS = () =>
  parseInt(process.env.PAYMENT_RATE_LIMIT_WINDOW_MS || "60000", 10);
const PAYMENT_RATE_LIMIT_MAX = () =>
  parseInt(process.env.PAYMENT_RATE_LIMIT_MAX || "25", 10);

const ADMIN_BOOTSTRAP_RATE_LIMIT_WINDOW_MS = () =>
  parseInt(process.env.ADMIN_BOOTSTRAP_RATE_LIMIT_WINDOW_MS || "900000", 10);
const ADMIN_BOOTSTRAP_RATE_LIMIT_MAX = () =>
  parseInt(process.env.ADMIN_BOOTSTRAP_RATE_LIMIT_MAX || "10", 10);

// Rate limiters — disabled in development to avoid false 429s from shared
// localhost IP across multiple apps and nodemon restarts sharing the same
// in-memory localStore. Re-enable in production by setting ENABLE_RATE_LIMITING=true.
const IS_RATE_LIMITING_ENABLED =
  process.env.ENABLE_RATE_LIMITING === "true" ||
  process.env.NODE_ENV === "production";

const passthrough = (_req, _res, next) => next();

export const globalApiRateLimiter = IS_RATE_LIMITING_ENABLED
  ? createRateLimiter({
      namespace: "global",
      windowMs: GLOBAL_RATE_LIMIT_WINDOW_MS(),
      max: GLOBAL_RATE_LIMIT_MAX(),
      keyGenerator: byIp,
      message: "Too many requests from this IP. Please retry shortly.",
    })
  : passthrough;

export const authRouteRateLimiter = IS_RATE_LIMITING_ENABLED
  ? createRateLimiter({
      namespace: "auth",
      windowMs: AUTH_RATE_LIMIT_WINDOW_MS(),
      max: AUTH_RATE_LIMIT_MAX(),
      keyGenerator: byIp,
      message: "Too many authentication requests. Please wait and retry.",
    })
  : passthrough;

export const otpRouteRateLimiter = IS_RATE_LIMITING_ENABLED
  ? createRateLimiter({
      namespace: "otp",
      windowMs: OTP_RATE_LIMIT_WINDOW_MS(),
      max: OTP_RATE_LIMIT_MAX(),
      keyGenerator: byIp,
      message: "Too many OTP requests. Please wait before retrying.",
    })
  : passthrough;

export const paymentRouteRateLimiter = IS_RATE_LIMITING_ENABLED
  ? createRateLimiter({
      namespace: "payment",
      windowMs: PAYMENT_RATE_LIMIT_WINDOW_MS(),
      max: PAYMENT_RATE_LIMIT_MAX(),
      keyGenerator: byUserOrIp,
      message: "Too many payment requests. Please wait before retrying.",
    })
  : passthrough;

export const adminBootstrapRateLimiter = IS_RATE_LIMITING_ENABLED
  ? createRateLimiter({
      namespace: "admin_bootstrap",
      windowMs: ADMIN_BOOTSTRAP_RATE_LIMIT_WINDOW_MS(),
      max: ADMIN_BOOTSTRAP_RATE_LIMIT_MAX(),
      keyGenerator: byIp,
      message: "Too many admin bootstrap attempts. Please wait before retrying.",
    })
  : passthrough;

export function createContentLengthGuard(maxBytes, message = "Payload too large") {
  const safeMax = Math.max(1024, Number(maxBytes || 1024 * 1024));
  return (req, res, next) => {
    const raw = Number(req.headers["content-length"] || 0);
    if (Number.isFinite(raw) && raw > safeMax) {
      return res.status(413).json({
        success: false,
        error: true,
        message,
        result: {
          code: "PAYLOAD_TOO_LARGE",
          maxBytes: safeMax,
        },
      });
    }
    return next();
  };
}
