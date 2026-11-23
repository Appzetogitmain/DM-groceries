import { getLegacyStatusFromOrder, getOrderStatusLabel } from '@/shared/utils/orderStatus';

/**
 * Customer-panel translation of the shared order-status label.
 * `@/shared/utils/orderStatus` is used by every panel, so it stays untouched;
 * this wrapper maps the same buckets to translation keys and falls back to
 * the shared English label for any status it does not know.
 */
export const translateOrderStatus = (t, order) => {
    const fallback = getOrderStatusLabel(order);
    const returnStatus = order?.returnStatus;
    if (returnStatus && returnStatus !== 'none') {
        return t(`orderStatus.return.${returnStatus}`, { defaultValue: fallback });
    }
    const bucket = getLegacyStatusFromOrder(order);
    return t(`orderStatus.${bucket}`, { defaultValue: fallback });
};

/** Translate a raw legacy/workflow status string (e.g. "out_for_delivery"). */
export const translateStatusKey = (t, status) => {
    if (!status) return '';
    const key = String(status).toLowerCase();
    const fallback = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    return t(`orderStatus.${key}`, { defaultValue: fallback });
};

/** Translate a payment method code (cod / online / wallet …). */
export const translatePaymentMethod = (t, method) => {
    if (!method) return t('payment.methods.online');
    const key = String(method).toLowerCase();
    return t(`payment.methods.${key}`, { defaultValue: String(method).toUpperCase() });
};
