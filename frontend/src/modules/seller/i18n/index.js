/**
 * Seller-panel i18next instance.
 *
 * Separate from the customer instance (different dictionaries and stored
 * preference). It is NOT registered as react-i18next's global instance:
 * seller components get it through <I18nextProvider> in SellerLanguageProvider,
 * so Admin/Delivery are never affected.
 */
import i18next from 'i18next';
import { rawGet, STORAGE_KEYS } from '@core/utils/storage';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGE_CODES, normalizeLanguage } from '@/shared/i18n/languages';
import { getLocalizedNameFor } from '@/shared/i18n/localizedName';

import en from '../locales/en/translation.json';
import hi from '../locales/hi/translation.json';
import gu from '../locales/gu/translation.json';

export const resources = {
    en: { translation: en },
    hi: { translation: hi },
    gu: { translation: gu },
};

/** Language saved on this device for the seller panel, or null. */
export const getStoredSellerLanguage = () => normalizeLanguage(rawGet(STORAGE_KEYS.SELLER_LANGUAGE));

const sellerI18n = i18next.createInstance();

sellerI18n.init({
    resources,
    lng: getStoredSellerLanguage() || DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGE_CODES,
    nonExplicitSupportedLngs: false,
    initAsync: false,
    interpolation: { escapeValue: false },
    returnNull: false,
    returnEmptyString: false,
    react: { useSuspense: false, bindI18n: 'languageChanged' },
});

/** Category/entity name in the current seller language (admin translation or English). */
export const getSellerLocalizedName = (entity, lang = sellerI18n.language) => getLocalizedNameFor(entity, lang);

export default sellerI18n;
