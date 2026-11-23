/**
 * Small display helpers for values that are stored/returned in English but
 * contain a translatable unit or placeholder name. They only touch the label
 * part — numbers, prices and user/API data stay unchanged.
 */
import customerI18n from './index';
import { getLocalizedNameFor, getLocalizedItemName } from '@/shared/i18n/localizedName';
import { transliterate } from '@/shared/i18n/transliterate';

/** "12-15 mins" → "12-15 मिनट" (only the unit is translated). */
export const translateEta = (t, value) => {
    if (typeof value !== 'string' || !value) return value;
    return value.replace(/\bmins?\b|\bminutes?\b/i, t('common.minsUnit'));
};

export { localizedFieldKey, pickNameFields } from '@/shared/i18n/localizedName';

/** Category/entity name in the current customer language (admin translation or English). */
export const getLocalizedName = (entity, lang = customerI18n.language) => getLocalizedNameFor(entity, lang);

/** "All" pseudo-category gets a translated label; real categories use the admin translation or their API name. */
export const translateCategoryName = (t, category) => {
    if (!category) return '';
    const id = String(category._id ?? category.id ?? '').toLowerCase();
    if (id === 'all') return t('categories.all');
    return getLocalizedName(category);
};

/** Address labels are stored as "home" / "work" / "other" (any case); custom labels pass through. */
export const translateAddressLabel = (t, label) => {
    if (!label) return '';
    const key = String(label).trim().toLowerCase();
    return t(`address.labels.${key}`, { defaultValue: label });
};

/** Product / package / order-line name in the current language (seller translation or English). */
export const getLocalizedItemLabel = (entity, base = 'name', lang = customerI18n.language) =>
    getLocalizedItemName(entity, lang, base);

/**
 * Display-only: shows a saved/typed address in the selected language by
 * transliterating its words (numbers and punctuation kept). The stored value is
 * never changed. English returns the text untouched.
 */
export const localizeAddressText = (text, lang = customerI18n.language) =>
    !text || !lang || lang === 'en' ? text || '' : transliterate(String(text), lang);
