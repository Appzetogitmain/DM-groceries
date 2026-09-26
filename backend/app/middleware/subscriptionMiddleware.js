import Subscription from "../models/subscription.js";
import handleResponse from "../utils/helper.js";

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
 * Middleware: Increment order usage count on the active subscription.
 *
 * Call this AFTER the order is successfully created/accepted (not before).
 * This is a post-action hook, not a guard.
 *
 * Usage (in your order controller, after successful order creation):
 *   await incrementOrderUsage(sellerId);
 */
export const incrementOrderUsage = async (sellerId) => {
    try {
        await Subscription.findOneAndUpdate(
            {
                seller: sellerId,
                status: "ACTIVE",
                endDate: { $gt: new Date() },
            },
            { $inc: { ordersUsed: 1 } }
        );
    } catch (error) {
        // Log but don't block — usage tracking is secondary to order flow
        console.error("[Subscription] Failed to increment order usage:", error.message);
    }
};

export default requireFeature;
