import Customer from "../models/customer.js";

/**
 * Tracks whether a customer account is blocked (isActive === false).
 *
 * verifyToken calls this on every customer request, so lookups are cached for
 * a short time. Admin block/unblock updates the cache of the current process
 * immediately; other instances pick it up when their cache entry expires.
 */
const CACHE_TTL_MS = 30 * 1000;
const cache = new Map(); // customerId -> { blocked: boolean, expiresAt: number }

export function setCustomerBlockedCache(customerId, blocked) {
  cache.set(String(customerId), { blocked, expiresAt: Date.now() + CACHE_TTL_MS });
}

export async function isCustomerBlocked(customerId) {
  const key = String(customerId);
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.blocked;

  const customer = await Customer.findById(key).select("isActive").lean();
  // Unknown customers are not "blocked" here; other layers handle missing accounts.
  const blocked = !!customer && customer.isActive === false;
  setCustomerBlockedCache(key, blocked);
  return blocked;
}

export const BLOCKED_MESSAGE = "Your account has been blocked. Please contact support.";
