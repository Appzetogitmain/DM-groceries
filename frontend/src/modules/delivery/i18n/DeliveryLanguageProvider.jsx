import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { useAuth } from '@core/context/AuthContext';
import { rawSet, STORAGE_KEYS } from '@core/utils/storage';
import LanguageSelectionModal from '@/shared/i18n/LanguageSelectionModal';
import { DEFAULT_LANGUAGE, getIntlLocale, normalizeLanguage } from '@/shared/i18n/languages';
import deliveryI18n, { getStoredDeliveryLanguage } from './index';
import { deliveryApi } from '../services/deliveryApi';

/**
 * Delivery-panel language provider. Same rules as the customer panel:
 *   1. Signed-in rider's saved profile preference (cross-device).
 *   2. Preference saved on this device.
 *   3. English.
 * First visit (nothing on device or account) shows the picker once.
 *
 * Also feeds translated strings to the shared dashboard layout through
 * LayoutTextContext (Admin keeps the English defaults).
 */
const DeliveryLanguageContext = createContext(null);

const persistLocal = (code) => rawSet(STORAGE_KEYS.DELIVERY_LANGUAGE, code);

export const DeliveryLanguageProvider = ({ children, promptOnFirstVisit = true }) => {
    const { user, role, isAuthenticated, isLoading: authLoading, updateUser } = useAuth();
    const [language, setLanguage] = useState(() => deliveryI18n.language || DEFAULT_LANGUAGE);
    const [hasLocalChoice, setHasLocalChoice] = useState(() => Boolean(getStoredDeliveryLanguage()));
    const [pickerOpen, setPickerOpen] = useState(false);
    const syncedUserRef = useRef(null);

    const isDeliverySession = role === 'delivery' && isAuthenticated;
    const userId = user?._id || user?.id || null;
    const remoteLanguage = normalizeLanguage(user?.preferredLanguage);

    const applyLanguage = useCallback((code) => {
        const next = normalizeLanguage(code) || DEFAULT_LANGUAGE;
        persistLocal(next);
        setHasLocalChoice(true);
        if (deliveryI18n.language !== next) deliveryI18n.changeLanguage(next);
        setLanguage(next);
        return next;
    }, []);

    useEffect(() => {
        const root = document.documentElement;
        const previous = root.getAttribute('lang');
        root.setAttribute('lang', language);
        return () => {
            if (previous) root.setAttribute('lang', previous);
        };
    }, [language]);

    useEffect(() => {
        if (!isDeliverySession || !userId) {
            if (!isAuthenticated) syncedUserRef.current = null;
            return;
        }
        if (syncedUserRef.current === userId) return;
        syncedUserRef.current = userId;

        if (remoteLanguage) {
            // Syncing with external state (the signed-in account).
            // eslint-disable-next-line react-hooks/set-state-in-effect
            applyLanguage(remoteLanguage);
            return;
        }
        const local = getStoredDeliveryLanguage();
        if (local) {
            deliveryApi.updateProfile({ preferredLanguage: local })
                .then(() => updateUser({ preferredLanguage: local }))
                .catch(() => { /* non-fatal: retried on next sign-in */ });
        }
    }, [isDeliverySession, isAuthenticated, userId, remoteLanguage, applyLanguage, updateUser]);

    const changeLanguage = useCallback(async (code) => {
        const next = applyLanguage(code);
        if (isDeliverySession && remoteLanguage !== next) {
            try {
                await deliveryApi.updateProfile({ preferredLanguage: next });
                updateUser({ preferredLanguage: next });
            } catch (error) {
                console.warn('[i18n] Failed to save delivery language:', error?.message || error);
            }
        }
        return next;
    }, [applyLanguage, isDeliverySession, remoteLanguage, updateUser]);

    const openLanguagePicker = useCallback(() => setPickerOpen(true), []);
    const closeLanguagePicker = useCallback(() => setPickerOpen(false), []);

    const needsFirstChoice = promptOnFirstVisit && !hasLocalChoice && !authLoading && !(isDeliverySession && remoteLanguage);

    const value = useMemo(() => ({
        language,
        intlLocale: getIntlLocale(language),
        changeLanguage,
        openLanguagePicker,
        closeLanguagePicker,
    }), [language, changeLanguage, openLanguagePicker, closeLanguagePicker]);


    return (
        <I18nextProvider i18n={deliveryI18n}>
            <DeliveryLanguageContext.Provider value={value}>
                    {children}
                    <LanguageSelectionModal
                        isOpen={needsFirstChoice || pickerOpen}
                        mode={needsFirstChoice ? 'first' : 'change'}
                        currentLanguage={language}
                        onSelect={async (code) => {
                            await changeLanguage(code);
                            setPickerOpen(false);
                        }}
                        onClose={needsFirstChoice ? undefined : closeLanguagePicker}
                    />
            </DeliveryLanguageContext.Provider>
        </I18nextProvider>
    );
};

export const useDeliveryLanguage = () => {
    const ctx = useContext(DeliveryLanguageContext);
    if (!ctx) {
        const lang = deliveryI18n.language || DEFAULT_LANGUAGE;
        return {
            language: lang,
            intlLocale: getIntlLocale(lang),
            changeLanguage: async () => lang,
            openLanguagePicker: () => {},
            closeLanguagePicker: () => {},
        };
    }
    return ctx;
};

export default DeliveryLanguageProvider;
