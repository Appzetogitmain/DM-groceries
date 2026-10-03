import Subscription from "../models/subscription.js";
import handleResponse from "../utils/helper.js";
import { emitNotificationEvent } from "../modules/notifications/notification.emitter.js";
import { NOTIFICATION_EVENTS } from "../modules/notifications/notification.constants.js";

/**
 * Middleware: Require an active subscription with a specific feature.
 *
 * Usage:
 *   router.post("/products", verifyToken, requireFeature("PRODUCT_LISTING"), createProduct);
 *
 * This checks:
 *   1. Seller has an ACTIVE subscription that hasn't expired.
 *   2. The subscription's plan includes the requested featureCode.
 *   3. The feature is still ACTIVE.
 *
 * On success, attaches `req.subscription` for downstream use.
 */
export const requireFeature = (featureCode) => {
    return async (req, res, next) => {
        try {
            // Only enforce for sellers
            if (req.user?.role !== "seller") {
                return next();
            }

            const sellerId = req.user.id;

            const subscription = await Subscription.findOne({
                seller: sellerId,
                status: "ACTIVE",
                endDate: { $gt: new Date() },
            }).populate({
                path: "plan",
                populate: {
                    path: "features",
                    select: "code status",
                },
            });

            if (!subscription) {
                return handleResponse(res, 403, "Active subscription required to access this feature");
            }

            const normalizeCode = (code) => String(code || "").toUpperCase().replace(/[_ ]/g, "");
            const normalizedFeatureCode = normalizeCode(featureCode);

            const hasFeature = subscription.plan?.features?.some(
                (feature) => normalizeCode(feature.code) === normalizedFeatureCode && feature.status === "ACTIVE"
            );

            if (!hasFeature) {
                return handleResponse(res, 403, `This feature (${featureCode}) is not available in your current plan`);
            }

            // Attach for downstream controllers (e.g. order limit checks)
            req.subscription = subscription;
            next();
        } catch (error) {
            return handleResponse(res, 500, "Unable to validate subscription feature access");
        }
    };
};

/**
 * Middleware: Check if seller has not exceeded their order limit.
 *
 * Usage:
 *   router.post("/orders", verifyToken, requireFeature("ORDER_MANAGEMENT"), checkOrderLimit, createOrder);
 *
 * Relies on `req.subscription` being set by `requireFeature` upstream.
 * If orderLimit is null (unlimited), it passes through.
 */
export const checkOrderLimit = async (req, res, next) => {
    try {
        // Only enforce for sellers
        if (req.user?.role !== "seller") {
            return next();
        }

        const subscription = req.subscription;
        if (!subscription) {
            return handleResponse(res, 403, "Active subscription required");
        }

        // null means unlimited
        if (subscription.orderLimit === null || subscription.orderLimit === undefined) {
            return next();
        }

        if (subscription.ordersUsed >= subscription.orderLimit) {
            return handleResponse(
                res,
                403,
                `Order limit reached (${subscription.ordersUsed}/${subscription.orderLimit}). Upgrade your plan to continue.`
            );
        }

        next();
    } catch (error) {
        return handleResponse(res, 500, "Unable to validate order limit");
    }
};

/**
 * Increment order usage count on the active subscription.
 *
 * Call this AFTER the order is successfully delivered (not before).
 * Returns the updated subscription document (or null).
 *
 * Usage (in your order workflow, after successful delivery):
 *   const updatedSub = await incrementOrderUsage(sellerId);
 */
export const incrementOrderUsage = async (sellerId) => {
    try {
        const updated = await Subscription.findOneAndUpdate(
            {
                seller: sellerId,
                status: "ACTIVE",
                endDate: { $gt: new Date() },
            },
            { $inc: { ordersUsed: 1 } },
            { new: true }
        );
        return updated;
    } catch (error) {
        // Log but don't block — usage tracking is secondary to order flow
        console.error("[Subscription] Failed to increment order usage:", error.message);
        return null;
    }
};

/**
 * Increment order usage AND check if 90% threshold is crossed.
 * If so, emit a SELLER_ORDER_LIMIT_WARNING notification.
 *
 * The alert fires only when crossing the 90% boundary (not on every order after 90%).
 */
export const incrementOrderUsageAndAlert = async (sellerId) => {
    try {
        const updated = await incrementOrderUsage(sellerId);
        if (!updated) return null;

        // Skip for unlimited plans
        if (updated.orderLimit === null || updated.orderLimit === undefined) {
            return updated;
        }

        const usagePercent = (updated.ordersUsed / updated.orderLimit) * 100;
        const previousUsage = ((updated.ordersUsed - 1) / updated.orderLimit) * 100;

        // Fire notification when crossing 90% threshold OR 50% threshold
        const crossed90 = usagePercent >= 90 && previousUsage < 90;
        const crossed50 = usagePercent >= 50 && usagePercent < 90 && previousUsage < 50;

        if (crossed90 || crossed50) {
            emitNotificationEvent(NOTIFICATION_EVENTS.SELLER_ORDER_LIMIT_WARNING, {
                sellerId: sellerId,
                ordersUsed: updated.ordersUsed,
                orderLimit: updated.orderLimit,
            });
        }

        return updated;
    } catch (error) {
        console.error("[Subscription] incrementOrderUsageAndAlert error:", error.message);
        return null;
    }
};

export default requireFeature;

