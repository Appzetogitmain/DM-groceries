/**
 * UI language registry shared by the Customer and Seller panels.
 *
 * To add a language:
 *   1. Add an entry below (code = ISO 639-1).
 *   2. Create `translation.json` for it in BOTH
 *      modules/customer/locales/<code>/ and modules/seller/locales/<code>/
 *      (copy `en` and translate).
 *   3. Register the JSON in modules/customer/i18n/index.js and
 *      modules/seller/i18n/index.js (`resources`).
 *   4. Add the code to SUPPORTED_UI_LANGUAGES in
 *      backend/app/constants/languages.js.
 *   5. Optional: categories get a `name<Code>` field (e.g. nameMr) in
 *      backend/app/models/category.js + admin CategoryTranslationFields.
 */
export const LANGUAGES = Object.freeze([
    { code: 'en', name: 'English', nativeName: 'English', intlLocale: 'en-IN' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', intlLocale: 'hi-IN' },
    // Keep Latin digits for dates/times so order dates match the numerals
    // used for prices and IDs.
    { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', intlLocale: 'gu-IN-u-nu-latn' },
]);

export const DEFAULT_LANGUAGE = 'en';

export const SUPPORTED_LANGUAGE_CODES = Object.freeze(LANGUAGES.map((l) => l.code));

/** Returns a supported language code, or null when the input is not one. */
export const normalizeLanguage = (value) => {
    if (typeof value !== 'string') return null;
    const code = value.trim().toLowerCase().split(/[-_]/)[0];
    return SUPPORTED_LANGUAGE_CODES.includes(code) ? code : null;
};

export const getLanguageMeta = (code) =>
    LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];

/** BCP-47 locale for Intl / toLocale*String() calls in the current language. */
export const getIntlLocale = (code) => getLanguageMeta(code).intlLocale;
