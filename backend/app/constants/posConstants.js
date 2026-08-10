/**
 * POS (Point of Sale) system constants.
 * Used by the seller POS billing flow for walk-in customers.
 */

export const POS_PAYMENT_MODE = {
  CASH: "CASH",
  ONLINE: "ONLINE",
  MIXED: "MIXED",
};

export const ALL_POS_PAYMENT_MODES = Object.values(POS_PAYMENT_MODE);

export const POS_ORDER_PREFIX = "POS";

/**
 * Generate a unique POS receipt number.
 * Format: POS-{6digitTimePart}-{4digitRandom}
 */
export function generatePosReceiptNumber() {
  const now = Date.now();
  const timePart = String(now).slice(-6);
  const randomPart = String(Math.floor(1000 + Math.random() * 9000));
  return `${POS_ORDER_PREFIX}-${timePart}-${randomPart}`;
}
