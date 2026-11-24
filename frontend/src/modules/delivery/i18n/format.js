/**
 * Small display helpers for the delivery panel.
 *
 * Backend statuses / types arrive in English ("Pending", "Settled", "Bike" …).
 * They are shown through `labels.*` keys so each language can translate them,
 * while unknown values fall back to the original text.
 */
import deliveryI18n from './index';
import { getIntlLocale } from '@/shared/i18n/languages';
import { transliterate } from '@/shared/i18n/transliterate';

export const labelKey = (value) =>
    `labels.${String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}`;

/** Translate a backend status/type label (falls back to the raw text). */
export const translateLabel = (t, value) => {
    if (value === undefined || value === null || value === '') return '';
    return t(labelKey(value), { defaultValue: String(value) });
};

/** Locale-aware date/time using the delivery language. */
export const deliveryLocale = (lang = deliveryI18n.language) => getIntlLocale(lang);

export const formatDate = (value, options = { day: '2-digit', month: 'short', year: 'numeric' }, lang) => {
    if (!value) return '';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString(deliveryLocale(lang), options);
};

export const formatTime = (value, options = { hour: '2-digit', minute: '2-digit' }, lang) => {
    if (!value) return '';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleTimeString(deliveryLocale(lang), options);
};

/**
 * Display-only: shows an address / place name in the selected language by
 * transliterating its words (numbers and punctuation kept). Stored and
 * geocoded values are never changed. English returns the text untouched.
 */
export const localizeAddress = (text, lang = deliveryI18n.language) =>
    !text || !lang || lang === 'en' ? text || '' : transliterate(String(text), lang);
