// UI languages accepted for customer/seller `preferredLanguage`.
// Keep in sync with frontend/src/shared/i18n/languages.js
export const SUPPORTED_UI_LANGUAGES = ["en", "hi", "gu"];

/** Returns the normalized code, or null when unsupported. */
export const normalizeUiLanguage = (value) => {
  const lang = typeof value === "string" ? value.trim().toLowerCase() : "";
  return SUPPORTED_UI_LANGUAGES.includes(lang) ? lang : null;
};
