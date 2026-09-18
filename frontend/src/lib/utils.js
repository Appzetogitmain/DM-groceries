import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
    return twMerge(clsx(inputs))
}

/** HTTPS/HTTP image attached to a notification row or FCM data payload. */
export function notificationImageUrl(notification) {
    const data = notification?.data || {};
    const raw = data.imageUrl || data.image || notification?.imageUrl || notification?.image || "";
    const url = String(raw).trim();
    return /^https?:\/\//i.test(url) ? url : "";
}

/** 
 * Format an Order ID to be user-friendly by returning its last 8 characters in uppercase.
 */
export function formatOrderId(orderId) {
    if (!orderId) return '';
    const idStr = String(orderId).trim();
    return idStr.length > 8 ? idStr.slice(-8).toUpperCase() : idStr.toUpperCase();
}
