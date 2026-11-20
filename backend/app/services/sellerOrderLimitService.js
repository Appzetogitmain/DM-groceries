import Seller from "../models/seller.js";
import Subscription from "../models/subscription.js";
import { invalidate } from "./cacheService.js";

/**
 * Seller order-limit enforcement.
 *
 * When a seller's active subscription hits its order limit:
 *   - the seller's shop is switched offline (isShopOpen = false,
 *     shopClosedReason = "ORDER_LIMIT"),
 *   - the seller can't switch it back on until the limit resets
 *     (new / renewed / upgraded subscription),
 *   - the seller's products are hidden on the customer side.
 * When a new subscription is activated, a shop that was closed because of the
 * limit is reopened automatically.
 *
 * Sellers whose email is in ORDER_LIMIT_EXEMPT_SELLER_EMAILS are never affected.
 */

export const SHOP_CLOSED_REASON_ORDER_LIMIT = "ORDER_LIMIT";

const DEFAULT_EXEMPT_EMAILS = ["harshvardhanpanc145@gmail.com"];

/** Lower-cased emails of sellers the order-limit rules don't apply to. */
export function getOrderLimitExemptEmails() {
  const fromEnv = String(process.env.ORDER_LIMIT_EXEMPT_SELLER_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...DEFAULT_EXEMPT_EMAILS, ...fromEnv]);
}

export function isSellerExemptFromOrderLimit(seller) {
  const email = String(seller?.email || "").trim().toLowerCase();
  return Boolean(email) && getOrderLimitExemptEmails().has(email);
}

const activeSubscriptionFilter = () => ({
  status: "ACTIVE",
  endDate: { $gt: new Date() },
});

/** True when the subscription has a numeric limit and has used all of it. */
export function isSubscriptionLimitReached(subscription) {
  if (!subscription) return false;
  const limit = subscription.orderLimit;
  if (limit === null || limit === undefined) return false; // unlimited
  return Number(subscription.ordersUsed || 0) >= Number(limit);
}

async function invalidateNearbySellerCache() {
  await invalidate("cache:sellers:nearby:*").catch(() => {});
}

/** Whether this seller has reached their order limit (false if exempt). */
export async function hasSellerReachedOrderLimit(sellerId, sellerDoc = null) {
  const seller =
    sellerDoc || (await Seller.findById(sellerId).select("email").lean());
  if (!seller || isSellerExemptFromOrderLimit(seller)) return false;
  const subscription = await Subscription.findOne({
    seller: sellerId,
    ...activeSubscriptionFilter(),
  })
    .select("orderLimit ordersUsed")
    .lean();
  return isSubscriptionLimitReached(subscription);
}

/**
 * Of the given seller ids, returns the ones that have reached their order
 * limit (exempt sellers excluded) as a Set of strings.
 */
export async function getLimitReachedSellerIds(sellerIds = []) {
  if (!sellerIds.length) return new Set();
  const subs = await Subscription.find({
    seller: { $in: sellerIds },
    ...activeSubscriptionFilter(),
    orderLimit: { $ne: null },
    $expr: { $gte: ["$ordersUsed", "$orderLimit"] },
  })
    .select("seller")
    .lean();
  if (!subs.length) return new Set();

  const reachedIds = [...new Set(subs.map((s) => String(s.seller)))];
  const sellers = await Seller.find({ _id: { $in: reachedIds } })
    .select("_id email")
    .lean();
  return new Set(
    sellers
      .filter((s) => !isSellerExemptFromOrderLimit(s))
      .map((s) => String(s._id)),
  );
}

/**
 * Switch the seller's shop offline if their order limit is reached.
 * Pass the updated subscription when you already have it.
 * Returns true when the shop was closed by this call.
 */
export async function enforceOrderLimitForSeller(sellerId, subscription = null) {
  try {
    const seller = await Seller.findById(sellerId)
      .select("email isShopOpen shopClosedReason")
      .lean();
    if (!seller || isSellerExemptFromOrderLimit(seller)) return false;

    const reached = subscription
      ? isSubscriptionLimitReached(subscription)
      : await hasSellerReachedOrderLimit(sellerId, seller);
    if (!reached) return false;

    return await closeShopForOrderLimit(sellerId, seller);
  } catch (error) {
    console.error("[OrderLimit] enforceOrderLimitForSeller failed:", error.message);
    return false;
  }
}

/** Sets the shop offline with reason ORDER_LIMIT (no-op if already closed). */
async function closeShopForOrderLimit(sellerId, seller) {
  if (!seller.isShopOpen) return false;
  const result = await Seller.updateOne(
    { _id: sellerId, isShopOpen: true },
    {
      $set: {
        isShopOpen: false,
        shopClosedReason: SHOP_CLOSED_REASON_ORDER_LIMIT,
      },
    },
  );
  if (result.modifiedCount === 0) return false;
  await invalidateNearbySellerCache();
  console.log(`[OrderLimit] Seller ${sellerId} reached order limit; shop set offline`);
  return true;
}

/**
 * After a new subscription is activated: reopen the shop if it was closed
 * only because of the order limit. Shops the seller closed themselves stay closed.
 */
export async function reopenShopAfterOrderLimitReset(sellerId) {
  try {
    const result = await Seller.updateOne(
      { _id: sellerId, shopClosedReason: SHOP_CLOSED_REASON_ORDER_LIMIT },
      { $set: { isShopOpen: true, shopClosedReason: null } },
    );
    if (result.modifiedCount > 0) {
      await invalidateNearbySellerCache();
      console.log(`[OrderLimit] Seller ${sellerId} shop reopened after new subscription`);
      return true;
    }
    return false;
  } catch (error) {
    console.error("[OrderLimit] reopenShopAfterOrderLimitReset failed:", error.message);
    return false;
  }
}

/**
 * One-off sweep (run on startup): close shops of sellers who are already at
 * their limit, e.g. sellers who hit it before this rule existed.
 */
export async function enforceOrderLimitForAllSellers() {
  const subs = await Subscription.find({
    ...activeSubscriptionFilter(),
    orderLimit: { $ne: null },
    $expr: { $gte: ["$ordersUsed", "$orderLimit"] },
  })
    .select("seller")
    .lean();
  const sellerIds = [...new Set(subs.map((s) => String(s.seller)))];
  if (!sellerIds.length) return 0;

  const sellers = await Seller.find({ _id: { $in: sellerIds }, isShopOpen: true })
    .select("_id email isShopOpen")
    .lean();
  let closed = 0;
  for (const seller of sellers) {
    if (isSellerExemptFromOrderLimit(seller)) continue;
    if (await closeShopForOrderLimit(seller._id, seller)) closed += 1;
  }
  return closed;
}
