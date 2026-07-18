import Customer from "../models/customer.js";
import Seller from "../models/seller.js";
import Delivery from "../models/delivery.js";
import { emitCustomerNotification, emitSellerNotification, emitDeliveryNotification, emitNotificationEvent } from "../modules/notifications/notification.service.js";
import { NOTIFICATION_EVENTS, NOTIFICATION_ROLES } from "../modules/notifications/notification.constants.js";
import logger from "../services/logger.js";

const JOB_NAME = "birthdayRewardJob";

export function getBirthdayRewardJobInterval() {
    // Run daily at 00:00 (midnight)
    return "0 0 * * *";
}

export function isBirthdayRewardJobEnabled() {
    return process.env.BIRTHDAY_REWARD_JOB_ENABLED !== "false";
}

export function getBirthdayRewardJobHandler() {
    return async () => {
        logger.info(`[${JOB_NAME}] Starting birthday check...`);
        try {
            const today = new Date();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            const suffix = `-${mm}-${dd}`;
            const regex = new RegExp(`${suffix}$`);

            const [customers, sellers, deliveries] = await Promise.all([
                Customer.find({ dob: { $regex: regex }, isActive: true }).select('_id name role'),
                Seller.find({ dob: { $regex: regex }, isActive: true }).select('_id name role'),
                Delivery.find({ dob: { $regex: regex } }).select('_id name role') // Delivery doesn't have isActive, uses isOnline but we shouldn't filter by isOnline for birthday
            ]);

            let totalBirthdays = 0;

            const notifyAdmin = (user, type) => {
                emitNotificationEvent(NOTIFICATION_EVENTS.GENERIC_ALERT, {
                    title: "Birthday Alert",
                    message: `Today is ${user.name}'s Birthday (${type}). Send a reward.`,
                    role: NOTIFICATION_ROLES.ADMIN
                });
                totalBirthdays++;
            };

            customers.forEach(c => notifyAdmin(c, 'Customer'));
            sellers.forEach(s => notifyAdmin(s, 'Seller'));
            deliveries.forEach(d => notifyAdmin(d, 'Delivery Partner'));

            logger.info(`[${JOB_NAME}] Completed birthday check. Found ${totalBirthdays} birthdays today.`);
        } catch (error) {
            logger.error(`[${JOB_NAME}] Failed to execute`, { error: error.message });
        }
    };
}
