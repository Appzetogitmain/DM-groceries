/**
 * Customer-panel i18next instance.
 *
 * This is a dedicated instance (i18next.createInstance) rather than the global
 * singleton, so translations are scoped to the Customer panel only. Seller,
 * Delivery and Admin panels never mount the provider and are unaffected.
 *
 * Dictionaries are bundled statically (no HTTP backend, no paid APIs), so the
 * instance is ready synchronously on first render — no flash of English.
 */
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { rawGet, STORAGE_KEYS } from '@core/utils/storage';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGE_CODES, normalizeLanguage } from './languages';

import en from '../locales/en/translation.json';
import hi from '../locales/hi/translation.json';
import gu from '../locales/gu/translation.json';

export const resources = {
    en: { translation: en },
    hi: { translation: hi },
    gu: { translation: gu },
};

/** Language saved on this device, or null when the user never chose one. */
export const getStoredLanguage = () => normalizeLanguage(rawGet(STORAGE_KEYS.CUSTOMER_LANGUAGE));

const customerI18n = i18next.createInstance();

customerI18n.use(initReactI18next).init({
    resources,
    lng: getStoredLanguage() || DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGE_CODES,
    nonExplicitSupportedLngs: false,
    initAsync: false,
    interpolation: {
        // React already escapes rendered strings.
        escapeValue: false,
    },
    returnNull: false,
    returnEmptyString: false,
    react: {
        useSuspense: false,
        bindI18n: 'languageChanged',
    },
});

export default customerI18n;
