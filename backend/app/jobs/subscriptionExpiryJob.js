import Subscription from "../models/subscription.js";
import SubscriptionOffer from "../models/subscriptionOffer.js";
import logger from "../services/logger.js";

const JOB_NAME = "subscriptionExpiryJob";

/**
 * Interval: runs every hour (3600000 ms) by default.
 * Override via SUBSCRIPTION_EXPIRY_JOB_INTERVAL_MS env var.
 */
export function getSubscriptionExpiryJobInterval() {
    return parseInt(process.env.SUBSCRIPTION_EXPIRY_JOB_INTERVAL_MS || "3600000", 10);
}

/**
 * Toggle: enabled by default, disable with SUBSCRIPTION_EXPIRY_JOB_ENABLED=false.
 */
export function isSubscriptionExpiryJobEnabled() {
    return process.env.SUBSCRIPTION_EXPIRY_JOB_ENABLED !== "false";
}

/**
 * Job handler: marks expired subscriptions and offers.
 */
export function getSubscriptionExpiryJobHandler() {
    return async () => {
        logger.info(`[${JOB_NAME}] Running subscription expiry check...`);
        try {
            const now = new Date();

            // 1. Expire active subscriptions past their endDate
            const expiredSubs = await Subscription.updateMany(
                {
                    status: "ACTIVE",
                    endDate: { $lte: now },
                },
                {
                    $set: { status: "EXPIRED" },
                }
            );

            if (expiredSubs.modifiedCount > 0) {
                logger.info(`[${JOB_NAME}] Expired ${expiredSubs.modifiedCount} subscription(s)`);
            }

            // 2. Expire scheduled offers that have passed their end date
            const expiredOffers = await SubscriptionOffer.updateMany(
                {
                    status: { $in: ["ACTIVE", "SCHEDULED"] },
                    endDate: { $lte: now },
                },
                {
                    $set: { status: "EXPIRED" },
                }
            );

            if (expiredOffers.modifiedCount > 0) {
                logger.info(`[${JOB_NAME}] Expired ${expiredOffers.modifiedCount} offer(s)`);
            }

            // 3. Activate scheduled offers whose startDate has arrived
            const activatedOffers = await SubscriptionOffer.updateMany(
                {
                    status: "SCHEDULED",
                    startDate: { $lte: now },
                    endDate: { $gt: now },
                },
                {
                    $set: { status: "ACTIVE" },
                }
            );

            if (activatedOffers.modifiedCount > 0) {
                logger.info(`[${JOB_NAME}] Activated ${activatedOffers.modifiedCount} scheduled offer(s)`);
            }

            logger.info(`[${JOB_NAME}] Completed`);
        } catch (error) {
            logger.error(`[${JOB_NAME}] Failed`, { message: error.message });
        }
    };
}
