import Admin from "../models/admin.js";
import logger from "./logger.js";
import { emitNotificationEvent } from "../modules/notifications/notification.emitter.js";
import { NOTIFICATION_EVENTS } from "../modules/notifications/notification.constants.js";

async function getAdminIds() {
  const admins = await Admin.find().select("_id").lean();
  return (admins || []).map((a) => a?._id).filter(Boolean);
}

async function notifyAdmins(eventType, applicant, extra = {}) {
  try {
    const adminIds = await getAdminIds();
    if (!adminIds.length) return;
    emitNotificationEvent(eventType, {
      adminIds,
      applicantId: applicant._id,
      // Unique per applicant so dedupe only blocks repeats for the same registration.
      messageId: `${eventType}:${applicant._id}`,
      name: applicant.name,
      ...extra,
    });
  } catch (error) {
    // Never fail a registration because the admin notification failed.
    logger.error("Failed to notify admins about new registration", {
      eventType,
      message: error.message,
    });
  }
}

export const notifyAdminsNewSeller = (seller) =>
  notifyAdmins(NOTIFICATION_EVENTS.ADMIN_NEW_SELLER, seller, { shopName: seller.shopName });

export const notifyAdminsNewDeliveryPartner = (delivery) =>
  notifyAdmins(NOTIFICATION_EVENTS.ADMIN_NEW_DELIVERY_PARTNER, delivery);
