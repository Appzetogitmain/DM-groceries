/**
 * Delivery-panel i18next instance.
 *
 * Separate from the customer / seller instances (own dictionaries and stored
 * preference). Not registered as react-i18next's global instance: delivery
 * components get it through <I18nextProvider> in DeliveryLanguageProvider.
 */
import i18next from 'i18next';
import { rawGet, STORAGE_KEYS } from '@core/utils/storage';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGE_CODES, normalizeLanguage } from '@/shared/i18n/languages';

import en from '../locales/en/translation.json';
import hi from '../locales/hi/translation.json';
import gu from '../locales/gu/translation.json';

export const resources = {
    en: { translation: en },
    hi: { translation: hi },
    gu: { translation: gu },
};

/** Language saved on this device for the delivery panel, or null. */
export const getStoredDeliveryLanguage = () => normalizeLanguage(rawGet(STORAGE_KEYS.DELIVERY_LANGUAGE));

const deliveryI18n = i18next.createInstance();

deliveryI18n.init({
    resources,
    lng: getStoredDeliveryLanguage() || DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGE_CODES,
    nonExplicitSupportedLngs: false,
    initAsync: false,
    interpolation: { escapeValue: false },
    returnNull: false,
    returnEmptyString: false,
    react: { useSuspense: false, bindI18n: 'languageChanged' },
});

export default deliveryI18n;
