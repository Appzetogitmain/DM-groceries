import { fallbackCategoryName } from './categoryNameFallback';

/**
 * Admin-entered translations of an entity's `name` are stored as
 * `name<Lang>` (e.g. `nameHi`, `nameGu`). These helpers pick the right one
 * and fall back to the English `name`.
 */
export const localizedFieldKey = (lang) =>
    lang && lang !== 'en' ? `name${lang.charAt(0).toUpperCase()}${lang.slice(1)}` : 'name';

export const getLocalizedNameFor = (entity, lang) => {
    if (!entity) return '';
    const translated = entity[localizedFieldKey(lang)];
    return (
        (typeof translated === 'string' && translated.trim()) || // admin-entered translation
        fallbackCategoryName(entity.name, lang) ||               // built-in grocery dictionary
        entity.name ||
        ''
    );
};

/** Keep only the name fields of an entity (for code that remaps API objects). */
export const pickNameFields = (entity) => {
    if (!entity) return {};
    const out = {};
    for (const key of Object.keys(entity)) {
        if (key === 'name' || /^name[A-Z][a-z]$/.test(key)) out[key] = entity[key];
    }
    return out;
};

/**
 * Name of a seller-entered entity (product / package / order line) in `lang`.
 * Uses `<base>Hi` / `<base>Gu` when present, otherwise the English value. No
 * category dictionary is applied — free-text names are never machine-guessed.
 */
export const getLocalizedItemName = (entity, lang, base = 'name') => {
    if (!entity) return '';
    const english = entity[base] || '';
    if (!lang || lang === 'en') return english;
    const suffix = lang.charAt(0).toUpperCase() + lang.slice(1);
    const translated = entity[`${base}${suffix}`];
    return (typeof translated === 'string' && translated.trim()) || english;
};
