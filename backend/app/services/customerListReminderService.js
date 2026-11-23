import mongoose from "mongoose";
import CustomerList from "../models/customerList.js";
import { notify } from "../modules/notifications/notification.service.js";
import { NOTIFICATION_EVENTS } from "../modules/notifications/notification.constants.js";
import logger from "./logger.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 330 * 60 * 1000; // UTC+05:30
const REMINDER_HOUR_IST = 9; // reminders go out around 9:00 AM local time

/**
 * Returns the reminder time `days` after `fromDate`, aligned to ~9:00 AM IST
 * on that calendar day so customers are not pinged in the middle of the night.
 */
export function computeNextReminderAt(fromDate, days) {
  const n = Number(days);
  if (!Number.isFinite(n) || n <= 0) return null;
  const base = new Date(fromDate || Date.now()).getTime() + n * DAY_MS;
  const ist = new Date(base + IST_OFFSET_MS);
  ist.setUTCHours(REMINDER_HOUR_IST, 0, 0, 0);
  return new Date(ist.getTime() - IST_OFFSET_MS);
}

/**
 * Called after a list order is placed. Records the order on the list and,
 * when the customer opted into reminders, arms the next restock reminder.
 * Never throws: order placement must not depend on this.
 */
export async function armListReminderAfterOrder({ listId, customerId, orderProductIds = [] }) {
  try {
    if (!listId || !customerId || !mongoose.isValidObjectId(listId)) return null;

    const list = await CustomerList.findOne({ _id: listId, customerId })
      .select("_id reminderDays items.productId")
      .lean();
    if (!list) return null;

    // Reminders are only for genuine list orders: every product in the order
    // must come from this list. A normal order (e.g. one carrying a stale
    // list marker from the browser) never arms a reminder.
    const listProductIds = new Set(
      (list.items || []).map((it) => String(it.productId || "")).filter(Boolean),
    );
    const orderIds = (orderProductIds || []).map((id) => String(id || "")).filter(Boolean);
    const isGenuineListOrder =
      orderIds.length > 0 && orderIds.every((id) => listProductIds.has(id));
    if (!isGenuineListOrder) return null;

    const now = new Date();
    const update = {
      $set: {
        lastOrderedAt: now,
        nextReminderAt: computeNextReminderAt(now, list.reminderDays),
      },
      $inc: { orderCount: 1 },
    };

    return await CustomerList.updateOne({ _id: list._id }, update);
  } catch (error) {
    logger.warn("Failed to arm customer list reminder", {
      listId: String(listId || ""),
      message: error.message,
    });
    return null;
  }
}

/**
 * "Remind later": push the reminder out by `hours` (default 24h).
 */
export async function snoozeListReminder({ listId, customerId, hours = 24 }) {
  const nextReminderAt = new Date(Date.now() + Number(hours || 24) * 60 * 60 * 1000);
  return CustomerList.findOneAndUpdate(
    { _id: listId, customerId },
    { $set: { nextReminderAt } },
    { new: true },
  )
    .select("_id name reminderDays nextReminderAt")
    .lean();
}

function buildReminderContent(list) {
  const listName = String(list.name || "My Grocery Basket").trim();
  const items = Array.isArray(list.items) ? list.items : [];

  let total = 0;
  const names = [];
  for (const it of items) {
    const prod = it.productId && typeof it.productId === "object" ? it.productId : null;
    const price = prod
      ? Number(prod.salePrice || prod.price || 0)
      : Number(it.unitPriceSnapshot || 0);
    total += price * (Number(it.quantity) || 1);
    if (prod?.name) names.push(prod.name);
  }

  const lastOrderedAt = list.lastOrderedAt ? new Date(list.lastOrderedAt) : null;
  const daysAgo = lastOrderedAt
    ? Math.max(1, Math.round((Date.now() - lastOrderedAt.getTime()) / DAY_MS))
    : null;

  const firstName = names[0];
  const subject =
    items.length === 1 && firstName
      ? firstName
      : firstName
        ? `${firstName} + ${items.length - 1} more`
        : `${items.length} items`;

  const title =
    items.length === 1 && firstName
      ? `${firstName} may finish soon`
      : `Your ${listName} may finish soon`;

  const lastOrderedText = daysAgo
    ? `Last ordered ${daysAgo} ${daysAgo === 1 ? "day" : "days"} ago. `
    : "";
  const totalText = total > 0 ? ` for ₹${Math.round(total)}` : "";
  const message = `${lastOrderedText}Reorder ${subject}${totalText}?`;

  return {
    title,
    message,
    estimatedTotal: Number(total.toFixed(2)),
    itemCount: items.length,
    daysAgo,
    listName,
  };
}

/**
 * Sends every reminder that is due. Each list is claimed atomically (by
 * clearing `nextReminderAt`) before notifying, so concurrent scheduler runs
 * can never double-send.
 */
export async function sendDueListReminders({ batchSize = 200 } = {}) {
  const now = new Date();
  const due = await CustomerList.find({
    status: "active",
    nextReminderAt: { $ne: null, $lte: now },
  })
    .select("_id nextReminderAt")
    .sort({ nextReminderAt: 1 })
    .limit(batchSize)
    .lean();

  let sent = 0;
  let failed = 0;

  for (const candidate of due) {
    const claimed = await CustomerList.findOneAndUpdate(
      { _id: candidate._id, nextReminderAt: candidate.nextReminderAt },
      {
        $set: { nextReminderAt: null, lastRemindedAt: now },
        $inc: { reminderCount: 1 },
      },
      { new: true },
    )
      .populate({ path: "items.productId", select: "name nameHi nameGu price salePrice mainImage" })
      .lean();

    if (!claimed) continue; // another runner took it

    try {
      const content = buildReminderContent(claimed);
      const listId = String(claimed._id);
      const firstImage = (claimed.items || []).find((it) => it.productId?.mainImage)
        ?.productId?.mainImage;

      await notify(NOTIFICATION_EVENTS.CUSTOMER_LIST_REMINDER, {
        userId: String(claimed.customerId),
        title: content.title,
        message: content.message,
        // Unique per reminder cycle so the notification dedupe layer never
        // swallows reminders for two different lists of the same customer.
        messageId: `list-reminder:${listId}:${new Date(candidate.nextReminderAt).getTime()}`,
        data: {
          listId,
          listName: content.listName,
          itemCount: content.itemCount,
          estimatedTotal: content.estimatedTotal,
          daysAgo: content.daysAgo,
          reminderDays: claimed.reminderDays || 0,
          kind: "MY_LIST_REMINDER",
          ...(firstImage ? { imageUrl: firstImage } : {}),
        },
      });
      sent += 1;
    } catch (error) {
      failed += 1;
      logger.error("Failed to send customer list reminder", {
        listId: String(claimed._id),
        message: error.message,
      });
    }
  }

  return { due: due.length, sent, failed };
}

export default {
  computeNextReminderAt,
  armListReminderAfterOrder,
  snoozeListReminder,
  sendDueListReminders,
};
