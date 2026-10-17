import Seller from "../models/seller.js";
import logger from "./logger.js";
import { sendSellerRejectionEmail } from "./emailService.js";
import { sendSmsIndiaHubOtp } from "./smsIndiaHubService.js";
import { useRealSMS } from "../utils/otp.js";

// India's DLT rules only allow SMS whose wording matches a pre-approved template, so the
// text below must be registered with the SMS provider and set in the environment:
//   SMS_INDIA_HUB_REJECTION_TEMPLATE_ID    - the approved DLT template id
//   SMS_INDIA_HUB_REJECTION_TEMPLATE_TEXT  - the approved wording, with ##var## for each
//                                            variable (1st = seller name, 2nd = reason)
// Without both, the SMS is skipped (the email and in-app notification still go out).
const REASON_MAX_CHARS = () =>
  parseInt(process.env.SMS_REJECTION_REASON_MAX_CHARS || "30", 10);

function buildRejectionSms({ name, reason }) {
  const template = String(process.env.SMS_INDIA_HUB_REJECTION_TEMPLATE_TEXT || "").trim();
  if (!template) return "";

  const limit = REASON_MAX_CHARS();
  const shortReason = String(reason || "").trim();
  const values = [
    String(name || "Seller").trim().split(/\s+/)[0],
    shortReason.length > limit ? `${shortReason.slice(0, Math.max(0, limit - 3))}...` : shortReason,
  ];

  let index = 0;
  return template.replace(/##var##|\{#var#\}/gi, () => values[Math.min(index++, values.length - 1)]);
}

async function sendEmail(seller, reason) {
  if (!seller.email) return "no_email";
  try {
    const result = await sendSellerRejectionEmail({
      email: seller.email,
      name: seller.name,
      shopName: seller.shopName,
      reason,
    });
    return result.delivered ? "sent" : "mock";
  } catch (error) {
    logger.error("Seller rejection email failed", { sellerId: String(seller._id), message: error.message });
    return "failed";
  }
}

async function sendSms(seller, reason) {
  if (!seller.phone) return "no_phone";

  const templateId = String(process.env.SMS_INDIA_HUB_REJECTION_TEMPLATE_ID || "").trim();
  const message = buildRejectionSms({ name: seller.name, reason });
  if (!templateId || !message) return "not_configured";
  if (!useRealSMS()) return "mock";

  try {
    await sendSmsIndiaHubOtp({ phone: seller.phone, message, templateId });
    return "sent";
  } catch (error) {
    logger.error("Seller rejection SMS failed", { sellerId: String(seller._id), message: error.message });
    return "failed";
  }
}

/**
 * Tells a rejected seller by email and SMS, including the reason.
 * Never throws: returns the outcome of each channel so the admin can see it.
 */
export async function notifySellerRejected(sellerId, reason) {
  const seller = await Seller.findById(sellerId).select("name shopName email phone").lean();
  if (!seller) return { email: "no_seller", sms: "no_seller" };

  const [email, sms] = await Promise.all([sendEmail(seller, reason), sendSms(seller, reason)]);
  return { email, sms };
}

export const __testables = { buildRejectionSms };
