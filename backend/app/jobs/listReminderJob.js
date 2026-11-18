import { sendDueListReminders } from "../services/customerListReminderService.js";
import logger from "../services/logger.js";

const JOB_NAME = "listReminderJob";

/**
 * Interval: every 15 minutes by default.
 * Override via LIST_REMINDER_JOB_INTERVAL_MS env var.
 */
export function getListReminderJobInterval() {
  return parseInt(process.env.LIST_REMINDER_JOB_INTERVAL_MS || "900000", 10);
}

/**
 * Toggle: enabled by default, disable with LIST_REMINDER_JOB_ENABLED=false.
 */
export function isListReminderJobEnabled() {
  return process.env.LIST_REMINDER_JOB_ENABLED !== "false";
}

/**
 * Job handler: sends "My List" restock reminders whose time has come.
 */
export function getListReminderJobHandler() {
  return async () => {
    try {
      const result = await sendDueListReminders();
      if (result.due > 0) {
        logger.info(`[${JOB_NAME}] Processed due list reminders`, result);
      }
    } catch (error) {
      logger.error(`[${JOB_NAME}] Failed`, { message: error.message });
    }
  };
}
