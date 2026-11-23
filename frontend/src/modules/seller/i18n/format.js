/**
 * Seller-panel display helpers. They only translate labels; numbers, prices,
 * IDs and user/API data stay unchanged.
 */
import sellerI18n from './index';
import { getIntlLocale } from '@/shared/i18n/languages';

const humanize = (value) =>
    String(value || '')
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

/** Order / return / payment / withdrawal status → translated label (falls back to a readable English label). */
export const translateStatus = (t, status) => {
    if (status === null || status === undefined || status === '') return '';
    const key = String(status).trim().toLowerCase().replace(/[\s-]+/g, '_');
    return t(`status.${key}`, { defaultValue: humanize(status) });
};

/** Payment method code (cod / cash / online / upi / wallet / card …) → translated label. */
export const translatePaymentMethod = (t, method) => {
    if (!method) return '';
    const key = String(method).trim().toLowerCase();
    return t(`paymentMethod.${key}`, { defaultValue: humanize(method) });
};

/** Locale string for Intl date/number formatting in the current seller language. */
export const sellerLocale = () => getIntlLocale(sellerI18n.language);

export const formatDate = (value, options) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(sellerLocale(), options);
};

export const formatDateTime = (value, options = { dateStyle: 'medium', timeStyle: 'short' }) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString(sellerLocale(), options);
};

/** Short weekday name ("Mon") in the current seller language. */
export const weekdayShort = (date) => new Date(date).toLocaleDateString(sellerLocale(), { weekday: 'short' });

/** Ledger/transaction type ("Order Payment", "Withdrawal", "refund"…) → translated label. */
export const translateLedgerType = (t, type) => {
    if (!type) return '';
    const key = String(type).trim().toLowerCase().replace(/[\s-]+/g, '_');
    return t(`ledgerType.${key}`, { defaultValue: humanize(type) });
};
